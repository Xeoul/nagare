import { assetUrl } from "./base-path";
import { AOZORA_BASE, stripAozoraMarkup } from "./aozora";

/** One searchable Aozora Bunko work — see scripts/build-aozora-catalog.mjs. */
export type AozoraWork = {
  title: string;
  titleKana: string;
  author: string;
  authorKana: string;
  /** "<person id>/files/<file name>" under the mirror's cards/ directory. */
  path: string;
  id: number;
};

type CatalogFile = {
  authors: [name: string, kana: string][];
  works: [title: string, titleKana: string, author: number, path: string, id: number][];
};

let catalogPromise: Promise<AozoraWork[]> | null = null;

/** The ~10,000-work index (≈300KB gzipped), fetched the first time search is used. */
export function loadAozoraCatalog(): Promise<AozoraWork[]> {
  if (!catalogPromise) {
    catalogPromise = fetch(assetUrl("/aozora/catalog.json"))
      .then((res) => {
        if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
        return res.json() as Promise<CatalogFile>;
      })
      .then(({ authors, works }) =>
        works.map(([title, titleKana, author, path, id]) => ({
          title,
          titleKana,
          author: authors[author][0],
          authorKana: authors[author][1],
          path,
          id,
        })),
      );
    catalogPromise.catch(() => (catalogPromise = null));
  }
  return catalogPromise;
}

const toHiragana = (text: string) =>
  text.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
const normalize = (text: string) => toHiragana(text.normalize("NFKC")).replace(/\s+/g, "").toLowerCase();

/**
 * Title and author matches, by title, author or either one's kana reading.
 * Exact and prefix title matches come first, then other title matches, then
 * works matched only by author.
 */
export function searchAozora(works: AozoraWork[], query: string, limit = 60): AozoraWork[] {
  const q = normalize(query);
  if (!q) return [];
  const scored: { work: AozoraWork; score: number }[] = [];
  for (const work of works) {
    const title = normalize(work.title);
    const titleKana = normalize(work.titleKana);
    let score = 0;
    if (title === q || titleKana === q) score = 4;
    else if (title.startsWith(q) || titleKana.startsWith(q)) score = 3;
    else if (title.includes(q) || titleKana.includes(q)) score = 2;
    else if (normalize(work.author).includes(q) || normalize(work.authorKana).includes(q)) score = 1;
    if (score > 0) scored.push({ work, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.work.title.length - b.work.title.length)
    .slice(0, limit)
    .map((s) => s.work);
}

/** The work's page on aozora.gr.jp — the fallback when the text mirror doesn't have it yet. */
export function aozoraCardUrl(work: AozoraWork): string {
  const person = work.path.split("/")[0];
  return `https://www.aozora.gr.jp/cards/${person}/card${work.id}.html`;
}

/** Downloads a work's text from the aozorahack mirror and strips Aozora's markup. */
export async function fetchAozoraWork(work: AozoraWork): Promise<string> {
  const file = work.path.split("/").pop();
  const res = await fetch(`${AOZORA_BASE}cards/${work.path}/${file}.txt`);
  if (res.status === 404) {
    throw new Error("This one isn't on the text mirror yet — it can still be read on Aozora Bunko's site.");
  }
  if (!res.ok) throw new Error(`Couldn't reach Aozora Bunko (${res.status}). Try again in a moment.`);
  const raw = new TextDecoder("shift_jis").decode(await res.arrayBuffer());
  return stripAozoraMarkup(raw);
}
