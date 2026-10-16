import JSZip from "jszip";
import { CHAPTER_PREFIX } from "./chapters";
import { pdfItemsToText, type PdfPage } from "./pdfText";

export type ParsedImport = {
  title: string;
  text: string;
  kind: "txt" | "epub" | "pdf";
};

export async function parseImportedFile(file: File): Promise<ParsedImport> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".epub")) {
    return {
      title: file.name.replace(/\.epub$/i, ""),
      kind: "epub",
      text: await extractEpubText(file),
    };
  }
  if (lowerName.endsWith(".pdf")) {
    const text = await extractPdfText(file);
    // A graded reader's first line is its title page; fall back to the file name.
    const firstLine = text.split("\n")[0]?.trim() ?? "";
    return {
      title: firstLine && firstLine.length <= 30 ? firstLine : file.name.replace(/\.pdf$/i, ""),
      kind: "pdf",
      text,
    };
  }
  if (lowerName.endsWith(".txt")) {
    return {
      title: file.name.replace(/\.txt$/i, ""),
      kind: "txt",
      text: await file.text(),
    };
  }
  throw new Error("Nagare can import .txt, .epub or .pdf files.");
}

/**
 * A minimal EPUB reader: follow container.xml to the OPF, read the spine
 * for reading order, then strip each chapter's HTML down to plain text.
 * Good enough for Phase 0; doesn't attempt styling, images, or footnotes.
 */
async function extractEpubText(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);

  const containerXml = await zip.file("META-INF/container.xml")?.async("text");
  if (!containerXml) throw new Error("Not a valid EPUB: missing container.xml");

  const opfPath = new DOMParser()
    .parseFromString(containerXml, "application/xml")
    .querySelector("rootfile")
    ?.getAttribute("full-path");
  if (!opfPath) throw new Error("Not a valid EPUB: missing OPF reference");

  const opfXml = await zip.file(opfPath)?.async("text");
  if (!opfXml) throw new Error("Not a valid EPUB: missing content OPF");

  const opfDoc = new DOMParser().parseFromString(opfXml, "application/xml");
  const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";

  const manifest = new Map<string, string>();
  opfDoc.querySelectorAll("manifest > item").forEach((item) => {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (id && href) manifest.set(id, href);
  });

  const spineHrefs = Array.from(opfDoc.querySelectorAll("spine > itemref"))
    .map((itemref) => itemref.getAttribute("idref"))
    .filter((idref): idref is string => Boolean(idref))
    .map((idref) => manifest.get(idref))
    .filter((href): href is string => Boolean(href));

  const chapters: string[] = [];
  for (const href of spineHrefs) {
    const entry = zip.file(opfDir + href);
    if (!entry) continue;
    const html = await entry.async("text");
    const doc = new DOMParser().parseFromString(html, "text/html");
    const text = doc.body?.textContent?.trim();
    if (!text) continue;
    // Each spine document becomes a chapter (see src/lib/chapters.ts), named
    // by its first heading when it has a short one.
    const heading = doc.querySelector("h1, h2, h3")?.textContent?.replace(/\s+/g, " ").trim();
    const title = heading && heading.length <= 40 ? heading : `Chapter ${chapters.length + 1}`;
    chapters.push(`${CHAPTER_PREFIX}${title}\n${text}`);
  }

  if (chapters.length === 0) {
    throw new Error("Couldn't find any readable chapters in that EPUB.");
  }
  return chapters.join("\n\n");
}

/**
 * Pulls the text out of a PDF with pdf.js (loaded only when a PDF is
 * imported — it's large) and rebuilds it as prose: see src/lib/pdfText.ts.
 * Only works for PDFs with real text in them, not scanned page images.
 */
async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerPort) {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" },
    );
  }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: PdfPage[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const { width, height } = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = content.items.flatMap((item) =>
      "str" in item
        ? [
            {
              str: item.str,
              x: item.transform[4],
              y: item.transform[5],
              size: Math.hypot(item.transform[2], item.transform[3]),
            },
          ]
        : [],
    );
    pages.push({ width, height, items });
  }
  await doc.cleanup();
  const text = pdfItemsToText(pages);
  if (!text.trim()) {
    throw new Error("Couldn't find any Japanese text in that PDF — it may be scanned images.");
  }
  return text;
}
