import type { GrammarItem, KanjiItem, Level, LevelData, VocabItem } from "@/lib/jlpt-data";

// Turns a level's study data into a sequence of small lessons. Grammar keeps
// the data's own teaching order (は, が, を, then particles, then verb forms).
// Kanji come simplest first (fewest strokes: numbers, then days and nature), a few per unit, and a word is only
// taught once every kanji in it has been introduced (kana-only words any time),
// so you never meet a word written in kanji you haven't seen.

export type Unit = {
  id: string;
  n: number;
  title: string;
  grammar: GrammarItem[];
  kanji: KanjiItem[];
  vocab: VocabItem[];
  /** Progress keys of everything in the unit. */
  keys: string[];
  /** Keys of this unit and every earlier one: what a check may draw wrong answers from. */
  pool: string[];
};

const GRAMMAR_PER_UNIT = 4;
const KANJI_PER_UNIT = 8;
const VOCAB_PER_UNIT = 8;
const KANJI_CHAR = /[一-鿿]/g;

export const unitKey = (level: Level, n: number) => `u:${level}:${n}`;

export function buildUnits(data: LevelData): Unit[] {
  const count = Math.max(1, Math.ceil(data.grammar.length / GRAMMAR_PER_UNIT), Math.ceil(data.kanji.length / KANJI_PER_UNIT));
  const perGrammar = Math.ceil(data.grammar.length / count);
  const perKanji = Math.ceil(data.kanji.length / count);
  const ordered = [...data.kanji].sort((a, b) => a.s - b.s);
  const levelKanji = new Set(ordered.map((k) => k.c));
  const seenKeys: string[] = [];
  const unmet = new Set(levelKanji);
  const used = new Set<VocabItem>();
  const units: Unit[] = [];

  for (let i = 0; i < count; i++) {
    const grammar = data.grammar.slice(i * perGrammar, (i + 1) * perGrammar);
    const kanji = ordered.slice(i * perKanji, (i + 1) * perKanji);
    const fresh = new Set(kanji.map((k) => k.c));
    for (const c of fresh) unmet.delete(c);

    // Words this level's kanji list hasn't covered yet stay out of the unit.
    const open = data.vocab.filter((v) => !used.has(v) && ![...v.w.matchAll(KANJI_CHAR)].some((m) => unmet.has(m[0])));
    // Words that show up in this unit's own grammar examples come first, then
    // words built from the new kanji; short everyday words beat long compounds.
    const examples = grammar.flatMap((g) => g.e.map((e) => e.j)).join("");
    const score = (v: VocabItem) =>
      (examples.includes(v.w) ? 3 : 0) + ([...v.w.matchAll(KANJI_CHAR)].some((m) => fresh.has(m[0])) ? 2 : 0) + (v.e.length ? 1 : 0);
    const vocab = open
      .map((v, order) => ({ v, order }))
      .sort((a, b) => score(b.v) - score(a.v) || a.v.w.length - b.v.w.length || a.order - b.order)
      .slice(0, VOCAB_PER_UNIT)
      .map((x) => x.v);
    for (const v of vocab) used.add(v);

    const keys = [...grammar.map((g) => `g:${g.id}`), ...kanji.map((k) => `k:${k.c}`), ...vocab.map((v) => `v:${v.w}`)];
    seenKeys.push(...keys);
    units.push({
      id: `${data.level}-${i + 1}`,
      n: i + 1,
      title: grammar.map((g) => g.p).slice(0, 2).join("、") || `Unit ${i + 1}`,
      grammar,
      kanji,
      vocab,
      keys,
      pool: [...seenKeys],
    });
  }
  return units;
}
