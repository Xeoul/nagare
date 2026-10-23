import type { GrammarItem, KanjiItem, Level, LevelData, VocabItem } from "@/lib/jlpt-data";

// Turns a level's study data into a sequence of small lessons. Grammar keeps
// the data's own teaching order (は, が, を, then particles, then verb forms).
// Kanji come simplest first (fewest strokes: numbers, then days and nature), a few per unit, and a word is only
// taught once every kanji in it has been introduced (kana-only words any time),
// so you never meet a word written in kanji you haven't seen.

export type Unit = {
  id: string;
  n: number;
  /** A vocabulary-only pack that follows the main units. */
  pack?: boolean;
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
const VOCAB_PER_UNIT = 12;
/** Words left over after the main units are taught in packs, up to this many packs. */
const PACK_SIZE = 12;
const MAX_PACKS = 40;
/** Share of a check's questions to get right to finish the unit. */
export const PASS_RATE = 0.7;

export const isPass = (right: number, total: number) => total > 0 && right / total >= PASS_RATE;
const KANJI_CHAR = /[一-鿿]/g;

/**
 * The data lists N5 grammar by topic (particles, then copula, then verbs), but a
 * beginner needs です and ます before most example sentences make sense. These
 * come first, in this order; everything else keeps the data's order.
 */
const EARLY: Partial<Record<Level, string[]>> = {
  N5: [
    "wa", "desu", "ka-question", "no", "o", "masu", "masen", "mashita", "masen-deshita", "deshita", "de-wa-arimasen-ja-nai",
    "ga-subject", "mo", "ni-time", "ni-destination", "ni-location", "e", "kore-sore-are-dore", "kono-sono-ano-dono", "koko-soko-asoko-doko",
  ],
};

function teachingOrder(data: LevelData): GrammarItem[] {
  const early = EARLY[data.level] ?? [];
  const first = early.flatMap((id) => data.grammar.filter((g) => g.id === id));
  return [...first, ...data.grammar.filter((g) => !early.includes(g.id))];
}

export const unitKey = (level: Level, n: number) => `u:${level}:${n}`;

export function buildUnits(data: LevelData): Unit[] {
  const count = Math.max(1, Math.ceil(data.grammar.length / GRAMMAR_PER_UNIT), Math.ceil(data.kanji.length / KANJI_PER_UNIT));
  const perGrammar = Math.ceil(data.grammar.length / count);
  const perKanji = Math.ceil(data.kanji.length / count);
  const grammarList = teachingOrder(data);
  const ordered = [...data.kanji].sort((a, b) => a.s - b.s);
  const levelKanji = new Set(ordered.map((k) => k.c));
  const seenKeys: string[] = [];
  const unmet = new Set(levelKanji);
  const used = new Set<VocabItem>();
  const units: Unit[] = [];

  for (let i = 0; i < count; i++) {
    const grammar = grammarList.slice(i * perGrammar, (i + 1) * perGrammar);
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

  // Everything the units didn't reach: plain vocabulary packs, easiest first.
  const rest = data.vocab
    .filter((v) => !used.has(v))
    .map((v, order) => ({ v, order }))
    .sort((a, b) => Number(b.v.e.length > 0) - Number(a.v.e.length > 0) || a.v.w.length - b.v.w.length || a.order - b.order)
    .map((x) => x.v);
  const packs = Math.min(MAX_PACKS, Math.floor(rest.length / PACK_SIZE) || (rest.length ? 1 : 0));
  for (let p = 0; p < packs; p++) {
    // A short remainder joins the last pack instead of becoming a pack of its own.
    const last = p === packs - 1 && packs < MAX_PACKS;
    const vocab = rest.slice(p * PACK_SIZE, last ? undefined : (p + 1) * PACK_SIZE);
    const keys = vocab.map((v) => `v:${v.w}`);
    seenKeys.push(...keys);
    units.push({
      id: `${data.level}-w${p + 1}`,
      n: units.length + 1,
      title: `Words: ${vocab.slice(0, 3).map((v) => v.w).join("、")}…`,
      pack: true,
      grammar: [],
      kanji: [],
      vocab,
      keys,
      pool: [...seenKeys],
    });
  }
  return units;
}
