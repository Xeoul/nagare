// Long works (Aozora Bunko novels) keep their chapter headings as marker
// lines — "§ " plus the heading — when their markup is stripped (see
// stripAozoraMarkup). The reader shows one chapter at a time, which keeps a
// 700KB novel from being tokenized and rendered as a single page.

export const CHAPTER_PREFIX = "§ ";

export type Chapter = { title: string; text: string };

/** Unmarked text longer than this (an imported .txt, say) is split into parts of about this size. */
const PART_CHARS = 10000;

function splitIntoParts(text: string): Chapter[] {
  if (text.length <= PART_CHARS * 1.5) return [{ title: "", text }];
  const parts: Chapter[] = [];
  let current: string[] = [];
  let size = 0;
  // Break only between paragraphs, so no sentence is cut in half.
  for (const paragraph of text.split("\n")) {
    current.push(paragraph);
    size += paragraph.length + 1;
    if (size >= PART_CHARS) {
      parts.push({ title: `Part ${parts.length + 1}`, text: current.join("\n").trim() });
      current = [];
      size = 0;
    }
  }
  const rest = current.join("\n").trim();
  if (rest) parts.push({ title: `Part ${parts.length + 1}`, text: rest });
  return parts;
}

/**
 * Splits text at chapter markers. Text with no markers is one untitled
 * chapter, or numbered parts if it's long. A heading with nothing under it (a part title right before its
 * first chapter, like こころ's 「上　先生と私」 then 「一」) folds into the next.
 */
export function splitChapters(text: string): Chapter[] {
  const chapters: Chapter[] = [];
  let title = "";
  let lines: string[] = [];
  let pendingTitle = "";
  const flush = () => {
    const body = lines.join("\n").trim();
    if (body) chapters.push({ title, text: body });
    else if (title) pendingTitle = pendingTitle ? `${pendingTitle} · ${title}` : title;
  };
  for (const line of text.split("\n")) {
    if (line.startsWith(CHAPTER_PREFIX)) {
      flush();
      const heading = line.slice(CHAPTER_PREFIX.length).trim();
      title = pendingTitle ? `${pendingTitle} · ${heading}` : heading;
      pendingTitle = "";
      lines = [];
    } else {
      lines.push(line);
    }
  }
  flush();
  return chapters.length > 0 ? chapters : splitIntoParts(text.trim());
}

/** The text with chapter marker lines removed — for anything that reads it as plain prose. */
export function stripChapterMarkers(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.startsWith(CHAPTER_PREFIX))
    .join("\n");
}
