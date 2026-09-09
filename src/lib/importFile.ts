import JSZip from "jszip";

export type ParsedImport = {
  title: string;
  text: string;
  kind: "txt" | "epub";
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
  if (lowerName.endsWith(".txt")) {
    return {
      title: file.name.replace(/\.txt$/i, ""),
      kind: "txt",
      text: await file.text(),
    };
  }
  throw new Error("Nagare can import .txt or .epub files for now.");
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
    if (text) chapters.push(text);
  }

  if (chapters.length === 0) {
    throw new Error("Couldn't find any readable chapters in that EPUB.");
  }
  return chapters.join("\n\n");
}
