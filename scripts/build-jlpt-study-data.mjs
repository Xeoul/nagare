// One-time data-prep script: slims OpenJLPT's per-level JSON (words, kanji and
// grammar points with example sentences) into one small file per level,
// public/jlpt/n5.json … n1.json, which the Study page and the quiz load on
// demand. Not run at app build/runtime.
//
// Usage: node scripts/build-jlpt-study-data.mjs /path/to/OpenJLPT/data/json
//
// Source: https://github.com/evanclan/OpenJLPT (CC BY-SA 4.0), built from
// Jonathan Waller's JLPT lists (CC BY), JMdict and KANJIDIC2 (EDRDG, CC BY-SA
// 4.0) and Tatoeba (CC BY 2.0 FR). See NOTICE.md.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const srcDir = process.argv[2];
if (!srcDir) {
  console.error("Usage: node scripts/build-jlpt-study-data.mjs /path/to/OpenJLPT/data/json");
  process.exit(1);
}

const read = (kind, level) => JSON.parse(readFileSync(path.join(srcDir, kind, `${level}.json`), "utf8"));
const outDir = path.join(import.meta.dirname, "..", "public", "jlpt");
mkdirSync(outDir, { recursive: true });

for (const level of ["n5", "n4", "n3", "n2", "n1"]) {
  const vocab = read("vocab", level).map((e) => ({
    w: e.word,
    r: e.reading,
    m: e.meanings.slice(0, 3),
    p: (e.pos ?? [])[0],
    // Readings over the kanji only for the first example, to keep the files small.
    e: (e.examples ?? []).slice(0, 2).map((x, i) => ({ j: x.ja, en: x.en, ...(i === 0 && x.furigana ? { f: x.furigana } : {}) })),
  }));
  const kanji = read("kanji", level).map((k) => ({
    c: k.character,
    s: k.strokes,
    on: k.onyomi,
    kun: k.kunyomi,
    m: k.meanings.slice(0, 5),
    w: (k.words ?? []).slice(0, 6),
  }));
  const grammar = read("grammar", level).map((g) => ({
    id: g.id,
    p: g.pattern,
    m: g.meaning,
    f: g.formation,
    t: g.tags ?? [],
    n: g.notes ?? "",
    e: (g.examples ?? []).map((x) => ({ j: x.ja, f: x.furigana, en: x.en })),
  }));
  const file = path.join(outDir, `${level}.json`);
  writeFileSync(file, JSON.stringify({ level: level.toUpperCase(), vocab, kanji, grammar }));
  console.log(`${level}: ${vocab.length} words, ${kanji.length} kanji, ${grammar.length} grammar -> ${file}`);
}
