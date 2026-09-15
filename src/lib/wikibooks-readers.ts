export type WikibooksReader = {
  title: string;
  author?: string;
  /** Wikibooks page title, e.g. "Japanese/Reader/Momotaro". */
  page: string;
  /** Matches the file at public/readers/<slug>.txt — see scripts/fetch-wikibooks-readers.mjs. */
  slug: string;
  note: string;
  level: "N5";
  /** The wikitext opens with an author byline before the story — see fetchReaderText. */
  dropFirstLine?: boolean;
};

/**
 * Genuine N5-level Japanese folk tales from Wikibooks' Japanese/Reader
 * (CC BY-SA 4.0) — real all-kana children's stories, unlike Aozora Bunko
 * (see src/lib/aozora.ts), which is native literature that never scores
 * below N3. "The Crab and The Monkey" is deliberately excluded even though
 * Wikibooks files it under Children's texts — it's actually Akutagawa's
 * satirical short story about the folk tale, not a children's version.
 */
export const WIKIBOOKS_READERS: WikibooksReader[] = [
  {
    title: "桃太郎",
    page: "Japanese/Reader/Momotaro",
    slug: "momotaro",
    note: "Momotarō — the peach boy",
    level: "N5",
  },
  {
    title: "一寸法師",
    page: "Japanese/Reader/Issunboushi",
    slug: "issunboushi",
    note: "Issun-bōshi — the one-inch boy",
    level: "N5",
  },
  {
    title: "したきりすずめ",
    page: "Japanese/Reader/The Tongue-Cut Sparrow",
    slug: "shitakiri-suzume",
    note: "The Tongue-Cut Sparrow",
    level: "N5",
  },
  {
    title: "かさじぞう",
    page: "Japanese/Reader/Kasa Jizo",
    slug: "kasa-jizo",
    note: "Kasa-Jizō — the straw-hat statues",
    level: "N5",
  },
  {
    title: "懐中時計",
    author: "夢野久作",
    page: "Japanese/Reader/Pocket Watch",
    slug: "kaichuudokei",
    note: "Yumeno Kyūsaku — The Pocket Watch",
    level: "N5",
    dropFirstLine: true,
  },
];

/**
 * Mirrors the stripping in scripts/fetch-wikibooks-readers.mjs (kept
 * standalone there) — only used here as a live fallback if a reader's
 * bundled file is ever missing.
 */
function stripWikitext(raw: string): string {
  return raw
    .replace(/\{\|[\s\S]*?\|\}/g, "")
    .replace(/\{\{furi\|([^|}]+)\|[^}]*\}\}/g, "$1")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/<\/?poem>/gi, "")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/div>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/^==+ .+ ==+\n?/gm, "")
    .replace(/[ 　]+/g, "")
    .replace(/[（(][ぁ-んァ-ンー]+[）)]/g, "")
    .replace(/\[\[wikt:[^\]]*\]\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Reads the bundled text (see scripts/fetch-wikibooks-readers.mjs); falls back to a live Wikibooks fetch if it's ever missing. */
export async function fetchReaderText(reader: WikibooksReader): Promise<string> {
  const bundled = await fetch(`/readers/${reader.slug}.txt`);
  if (bundled.ok) return bundled.text();

  const url = `https://en.wikibooks.org/w/api.php?action=parse&page=${encodeURIComponent(
    reader.page,
  )}&prop=wikitext&format=json&origin=*`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Couldn't reach Wikibooks (${res.status}). Try again in a moment.`);
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error.info ?? "Couldn't load that one.");
  let text = stripWikitext(data.parse.wikitext["*"]);
  if (reader.dropFirstLine) text = text.replace(/^.*\n\n?/, "").trim();
  return text;
}
