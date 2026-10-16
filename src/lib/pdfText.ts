// Turns a PDF's positioned text runs back into readable Japanese prose.
// Written with graded-reader PDFs in mind (e.g. Tadoku's free books, which
// a learner downloads and imports themselves): furigana is set as separate,
// much smaller runs above the line, and many runs space out every character.

export type PdfTextItem = {
  str: string;
  /** Baseline position, PDF units (y grows upward). */
  x: number;
  y: number;
  /** Font size — the run's height. */
  size: number;
};

const JAPANESE = /[぀-ヿ一-鿿々〆ー]/;
const SENTENCE_END = /[。！？!?」』）)…]$/;

export type PdfPage = { width: number; height: number; items: PdfTextItem[] };

/**
 * A landscape page in a portrait book is a printed two-up spread (Tadoku's
 * print editions put pages side by side, left then right) — split it so
 * the two pages' lines don't interleave.
 */
function splitSpreads(pages: PdfPage[]): PdfTextItem[][] {
  return pages.flatMap(({ width, height, items }) => {
    if (width <= height * 1.2) return [items];
    const mid = width / 2;
    return [items.filter((item) => item.x < mid), items.filter((item) => item.x >= mid)];
  });
}

/**
 * Pages that aren't the story: Tadoku's "how to read" front matter (the same
 * in every book) and the colophon with publication date and credits.
 */
const BOILERPLATE = /多読の読み方|読む前に|How to do Tadoku|発行日[：:]/;

/** The body text size: the size carrying the most Japanese characters. */
function bodySize(pages: PdfTextItem[][]): number {
  const weight = new Map<number, number>();
  for (const page of pages) {
    for (const item of page) {
      if (!JAPANESE.test(item.str)) continue;
      const size = Math.round(item.size);
      weight.set(size, (weight.get(size) ?? 0) + item.str.replace(/\s/g, "").length);
    }
  }
  let best = 0;
  let bestWeight = -1;
  for (const [size, w] of weight) {
    if (w > bestWeight) [best, bestWeight] = [size, w];
  }
  return best;
}

/** Drops the spaces some PDFs put between every Japanese character. */
function tidy(line: string): string {
  return line
    .replace(/([^\x00-\x7f])\s+(?=[^\x00-\x7f])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function pageLines(items: PdfTextItem[], minSize: number): string[] {
  const kept = items
    .filter((item) => item.str.trim() && item.size >= minSize)
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PdfTextItem[][] = [];
  for (const item of kept) {
    const line = lines.at(-1);
    // Same line when the baselines are within half a character of each other.
    if (line && Math.abs(line[0].y - item.y) < item.size * 0.5) line.push(item);
    else lines.push([item]);
  }
  return lines
    .map((line) => tidy(line.sort((a, b) => a.x - b.x).map((item) => item.str).join(" ")))
    .filter((line) => JAPANESE.test(line));
}

/**
 * Rebuilds the text: two-up spreads are split; furigana (runs well under
 * the body size), lines with no Japanese in them (page numbers, English
 * notes) and boilerplate pages are dropped; a line that doesn't end a
 * sentence runs on into the next, and each page starts a new paragraph.
 */
export function pdfItemsToText(pdfPages: PdfPage[]): string {
  const pages = splitSpreads(pdfPages);
  const minSize = bodySize(pages) * 0.75;
  const paragraphs: string[] = [];
  for (const items of pages) {
    const lines = pageLines(items, minSize);
    if (lines.length === 0 || lines.some((line) => BOILERPLATE.test(line))) continue;
    let paragraph = "";
    for (const line of lines) {
      paragraph += paragraph && SENTENCE_END.test(paragraph) ? `\n${line}` : line;
    }
    paragraphs.push(paragraph);
  }
  return paragraphs.join("\n");
}
