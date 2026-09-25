// One-time data-prep script: turns the official JMdict XML into a compact
// JSON lookup of "common" words, committed as a static asset (see
// data/dictionary/jmdict-common.json). Not run at app build/runtime —
// re-run by hand when JMdict updates.
//
// Usage: node scripts/build-dictionary.mjs /path/to/JMdict_e
//
// Source: http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz (EDRDG, Creative
// Commons Attribution-ShareAlike Licence v4.0 — see
// https://www.edrdg.org/edrdg/licence.html).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const srcPath = process.argv[2];
if (!srcPath) {
  console.error("Usage: node scripts/build-dictionary.mjs /path/to/JMdict_e");
  process.exit(1);
}

const xml = readFileSync(srcPath, "utf-8");

// JLPT level tags (see scripts/build-jlpt-levels.mjs) — regenerate that
// first if this file doesn't exist yet.
const LEVEL_RANK = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };
let jlptLevels = {};
try {
  jlptLevels = JSON.parse(
    readFileSync(new URL("../data/dictionary/jlpt-levels.json", import.meta.url), "utf-8"),
  );
} catch {
  console.error("No jlpt-levels.json found — entries will ship without level tags.");
}
function lookupLevel(candidates) {
  let best = null;
  for (const word of candidates) {
    const level = jlptLevels[word];
    if (level && (!best || LEVEL_RANK[level] < LEVEL_RANK[best])) best = level;
  }
  return best;
}

// JMdict's DOCTYPE defines an ENTITY per POS/field/misc code, e.g.
// <!ENTITY v5r "Godan verb with 'ru' ending">. Resolve those into readable
// text instead of hardcoding JMdict's tag list ourselves.
const entities = new Map();
for (const m of xml.matchAll(/<!ENTITY\s+([\w-]+)\s+"([^"]*)"\s*>/g)) {
  entities.set(m[1], m[2]);
}
function resolveEntities(text) {
  return text.replace(/&([\w-]+);/g, (whole, name) => entities.get(name) ?? whole);
}
function decodeXmlText(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

const PRIORITY_TAGS = ["news1", "ichi1", "spec1", "spec2", "gai1"];
const hasPriority = (tags) => tags.some((t) => PRIORITY_TAGS.includes(t));

function extractAll(block, tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
  return [...block.matchAll(re)].map((m) => decodeXmlText(m[1].trim()));
}

const entries = [];
const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
let match;
let scanned = 0;

while ((match = entryRe.exec(xml))) {
  scanned++;
  const block = match[1];

  const kanjiForms = extractAll(block, "keb");
  const kanjiPri = [...block.matchAll(/<k_ele>[\s\S]*?<\/k_ele>/g)].map((k) =>
    extractAll(k[0], "ke_pri"),
  );
  const readingForms = extractAll(block, "reb");
  const readingPri = [...block.matchAll(/<r_ele>[\s\S]*?<\/r_ele>/g)].map((r) =>
    extractAll(r[0], "re_pri"),
  );

  const priorityTags = [...kanjiPri.flat(), ...readingPri.flat()];
  if (!hasPriority(priorityTags)) continue;

  const senseBlocks = [...block.matchAll(/<sense>([\s\S]*?)<\/sense>/g)].map((s) => s[1]);
  const senses = senseBlocks.slice(0, 3).map((sense) => {
    const pos = [...new Set(extractAll(sense, "pos").map(resolveEntities))];
    const glosses = extractAll(sense, "gloss").slice(0, 3);
    return { pos, glosses };
  });
  const glosses = senses.flatMap((s) => s.glosses).slice(0, 5);
  if (glosses.length === 0) continue;
  const pos = [...new Set(senses.flatMap((s) => s.pos))].slice(0, 2);

  const reading = readingForms[0] ?? kanjiForms[0];
  const surfaceForms = [...new Set([...kanjiForms, ...readingForms])];
  const level = lookupLevel(surfaceForms);

  entries.push({
    surface: surfaceForms,
    reading,
    pos: pos.join(", "),
    meanings: glosses,
    ...(level ? { level } : {}),
    // A kana string like は is a headword of its own for particles/auxiliaries
    // (no k_ele at all) but also shows up as a mere alternate *reading* of
    // unrelated kanji words (羽, 歯, 葉 for は). When both claim the same
    // bare-kana surface key, the standalone kana entry is almost always the
    // one a reader means — prefer it, then fall back to priority-tag count.
    hasKanji: kanjiForms.length > 0,
    priorityWeight: priorityTags.length,
  });
}

console.error(`Scanned ${scanned} entries, kept ${entries.length} common ones.`);

// JMdict's re_pri/ke_pri priority tags come from newspaper/frequency-list
// corpora that under-tag bound grammatical morphemes — の and ます, for
// instance, have no priority-tagged kana-only entry at all, so the automatic
// pass above finds no legitimate "common" candidate and a rarer word with a
// coincidentally identical (often irregular) reading wins the key by
// default. These are exactly the words a learner taps constantly, so force
// them in directly from the full (non-priority-filtered) entry list.
const GRAMMAR_OVERRIDES = [
  "は", "が", "を", "に", "へ", "で", "と", "も", "の", "や", "か", "ね", "よ", "わ", "ぞ", "な",
  "だ", "です", "ます", "ない", "た", "て", "って", "ば", "し", "のに", "ので", "から", "まで",
  "より", "だけ", "しか", "でも", "ても", "なら", "たら", "ながら", "という", "けど", "けれど",
  "けれども", "こそ", "さえ", "など",
];
const grammarSet = new Set(GRAMMAR_OVERRIDES);
// A few of these (の, だけ, ...) have their real particle sense attached to
// an entry that *also* lists rare/archaic kanji spellings (乃, 之, 丈, ...) —
// so "no kanji at all" isn't a safe filter here. Prefer a grammatical part
// of speech over that, and only fall back to "no kanji" as a second guess.
const GRAMMAR_POS = ["prt", "aux", "aux-v", "aux-adj", "cop", "conj"];
const grammarOverrides = {};
const grammarFallback = {};
{
  const re2 = /<entry>([\s\S]*?)<\/entry>/g;
  let m2;
  while ((m2 = re2.exec(xml))) {
    const block = m2[1];
    const kanjiForms = extractAll(block, "keb");
    const readingForms = extractAll(block, "reb");
    const reading = readingForms[0];
    if (!reading || !grammarSet.has(reading)) continue;

    const rawPos = [...block.matchAll(/<pos>&([\w-]+);<\/pos>/g)].map((m) => m[1]);
    const isGrammatical = rawPos.some((p) => GRAMMAR_POS.includes(p));
    if (!isGrammatical && kanjiForms.length > 0) continue;
    if (grammarOverrides[reading]) continue;
    if (!isGrammatical && grammarFallback[reading]) continue;

    const senseBlocks = [...block.matchAll(/<sense>([\s\S]*?)<\/sense>/g)].map((s) => s[1]);
    const senses = senseBlocks.slice(0, 3).map((sense) => ({
      pos: [...new Set(extractAll(sense, "pos").map(resolveEntities))],
      glosses: extractAll(sense, "gloss").slice(0, 3),
    }));
    const glosses = senses.flatMap((s) => s.glosses).slice(0, 5);
    if (glosses.length === 0) continue;
    const pos = [...new Set(senses.flatMap((s) => s.pos))].slice(0, 2);
    const level = lookupLevel([reading, ...kanjiForms]);
    const resolved = { reading, pos: pos.join(", "), meanings: glosses, ...(level ? { level } : {}) };
    if (isGrammatical) grammarOverrides[reading] = resolved;
    else grammarFallback[reading] = resolved;
  }
}
for (const [reading, entry] of Object.entries(grammarFallback)) {
  if (!grammarOverrides[reading]) grammarOverrides[reading] = entry;
}
console.error(
  `Grammar overrides resolved: ${Object.keys(grammarOverrides).length}/${GRAMMAR_OVERRIDES.length}`,
);

function isBetter(candidate, incumbent) {
  if (candidate.hasKanji !== incumbent.hasKanji) return !candidate.hasKanji;
  return candidate.priorityWeight > incumbent.priorityWeight;
}

const bySurface = {};
for (const entry of entries) {
  const { surface, ...rest } = entry;
  for (const form of surface) {
    const incumbent = bySurface[form];
    if (!incumbent || isBetter(rest, incumbent)) bySurface[form] = rest;
  }
}

for (const entry of Object.values(bySurface)) {
  delete entry.hasKanji;
  delete entry.priorityWeight;
}

Object.assign(bySurface, grammarOverrides);

mkdirSync(new URL("../data/dictionary", import.meta.url), { recursive: true });
const outPath = new URL("../data/dictionary/jmdict-common.json", import.meta.url);
writeFileSync(outPath, JSON.stringify(bySurface));
console.error(`Wrote ${Object.keys(bySurface).length} surface-form keys to ${outPath.pathname}`);
