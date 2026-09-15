// One-time data-prep script: downloads each work listed in READERS from
// Wikibooks' Japanese/Reader (children's-tier folk tales — CC BY-SA 4.0),
// strips wiki/HTML markup and furigana glosses, and writes plain text to
// public/readers/<slug>.txt — committed as a static asset, same pattern as
// scripts/fetch-classics.mjs. Not run at app build/runtime; re-run by hand
// if READERS changes.
//
// Usage: node scripts/fetch-wikibooks-readers.mjs

import { writeFileSync, mkdirSync } from "node:fs";

const API_BASE = "https://en.wikibooks.org/w/api.php";
const USER_AGENT = "NagareReadingApp/1.0 (https://nagare-chi.vercel.app; personal-use Japanese learner app)";

// "The Crab and The Monkey" is excluded even though Wikibooks files it under
// Children's texts — it's actually Akutagawa's satirical short story about
// the folk tale (death-penalty/capitalism commentary), not a children's
// version of it, and doesn't belong next to genuinely simple readings.
const READERS = [
  { page: "Japanese/Reader/Momotaro", slug: "momotaro" },
  { page: "Japanese/Reader/Issunboushi", slug: "issunboushi" },
  { page: "Japanese/Reader/The Tongue-Cut Sparrow", slug: "shitakiri-suzume" },
  { page: "Japanese/Reader/Kasa Jizo", slug: "kasa-jizo" },
  // Its wikitext opens with an author byline line (夢野久作) before the story
  // starts — dropped here since the app surfaces authorship separately (see
  // the `author` field in src/lib/wikibooks-readers.ts), same as Classics.
  { page: "Japanese/Reader/Pocket Watch", slug: "kaichuudokei", dropFirstLine: true },
];

function stripWikitext(raw) {
  return raw
    .replace(/\{\|[\s\S]*?\|\}/g, "") // wiki tables (the per-story vocab glossary)
    .replace(/\{\{furi\|([^|}]+)\|[^}]*\}\}/g, "$1") // {{furi|漢字|かな}} -> 漢字
    .replace(/\{\{[^}]*\}\}/g, "") // any other bare template, e.g. {{BookCat}}
    .replace(/<\/?poem>/gi, "")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/div>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/^==+ .+ ==+\n?/gm, "") // section headings
    .replace(/[ 　]+/g, "") // pedagogical word-spacing (half- and full-width) —
    // removed before the furigana-paren pass below so a reading split across
    // two words by a space, e.g. "(ゆめの　きゅうさく)", still matches as pure kana.
    .replace(/[（(][ぁ-んァ-ンー]+[）)]/g, "") // furigana glosses, e.g. 本当（ほんとう）
    .replace(/\[\[wikt:[^\]]*\]\]/g, "") // leftover wiktionary links
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchWikitext(page) {
  const url = `${API_BASE}?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&origin=*`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.info ?? data.error.code);
  return data.parse.wikitext["*"];
}

mkdirSync(new URL("../public/readers/", import.meta.url), { recursive: true });

for (const { page, slug, dropFirstLine } of READERS) {
  process.stdout.write(`Fetching ${slug}... `);
  try {
    const wikitext = await fetchWikitext(page);
    let text = stripWikitext(wikitext);
    if (dropFirstLine) text = text.replace(/^.*\n\n?/, "").trim();
    writeFileSync(new URL(`../public/readers/${slug}.txt`, import.meta.url), text, "utf-8");
    console.log(`OK (${text.length} chars)`);
  } catch (err) {
    console.log(`FAILED (${err.message})`);
  }
  // Wikimedia rate-limits anonymous API traffic fairly aggressively.
  await new Promise((r) => setTimeout(r, 8000));
}
