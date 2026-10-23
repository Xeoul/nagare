// Rule-based conjugation for the quiz's Conjugation drill. Covers regular
// ichidan (る) verbs, godan (う) verbs by their ending, and い-adjectives,
// using the part-of-speech tag from the JLPT data (v1, v5k, adj-i …).
// Irregular verbs (する, 来る, 行く, ある-type honorific verbs) and いい are
// skipped by the callers.

export type VerbForm = "masu" | "te" | "ta" | "nai" | "potential" | "volitional";
export type AdjForm = "te" | "nai" | "ta" | "adverb";

export const VERB_FORMS: { id: VerbForm; label: string }[] = [
  { id: "masu", label: "ます-form" },
  { id: "te", label: "て-form" },
  { id: "ta", label: "た-form" },
  { id: "nai", label: "ない-form" },
  { id: "potential", label: "potential form (can do)" },
  { id: "volitional", label: "volitional form (let's / will)" },
];

export const ADJ_FORMS: { id: AdjForm; label: string }[] = [
  { id: "te", label: "て-form" },
  { id: "nai", label: "negative (ない)" },
  { id: "ta", label: "past (た)" },
  { id: "adverb", label: "adverb (く)" },
];

// ending → [i-stem, a-stem, e-stem, o-stem, te, ta]
const GODAN: Record<string, [string, string, string, string, string, string]> = {
  う: ["い", "わ", "え", "お", "って", "った"],
  く: ["き", "か", "け", "こ", "いて", "いた"],
  ぐ: ["ぎ", "が", "げ", "ご", "いで", "いだ"],
  す: ["し", "さ", "せ", "そ", "して", "した"],
  つ: ["ち", "た", "て", "と", "って", "った"],
  ぬ: ["に", "な", "ね", "の", "んで", "んだ"],
  ぶ: ["び", "ば", "べ", "ぼ", "んで", "んだ"],
  む: ["み", "ま", "め", "も", "んで", "んだ"],
  る: ["り", "ら", "れ", "ろ", "って", "った"],
};

const GODAN_TAGS = new Set(["v5u", "v5k", "v5g", "v5s", "v5t", "v5n", "v5b", "v5m", "v5r"]);

export type VerbClass = "ichidan" | "godan";

/** The conjugation class of a word from its POS tag, or null if the drill shouldn't use it. */
export function verbClass(word: string, pos: string | undefined): VerbClass | null {
  if (!pos || word.length < 2) return null;
  if (pos === "v1") return word.endsWith("る") ? "ichidan" : null;
  if (!GODAN_TAGS.has(pos)) return null;
  // 行く is the one godan く-verb with an irregular て/た (いって, not いいて).
  if (word.endsWith("行く") || word === "いく") return null;
  return GODAN[word.slice(-1)] ? "godan" : null;
}

export function conjugateVerb(word: string, cls: VerbClass, form: VerbForm): string {
  const stem = word.slice(0, -1);
  if (cls === "ichidan") {
    return stem + { masu: "ます", te: "て", ta: "た", nai: "ない", potential: "られる", volitional: "よう" }[form];
  }
  const [i, a, e, o, te, ta] = GODAN[word.slice(-1)];
  return stem + { masu: `${i}ます`, te, ta, nai: `${a}ない`, potential: `${e}る`, volitional: `${o}う` }[form];
}

/** A wrong but tempting answer: the same verb conjugated by the other class's rule. */
export function conjugateWrongClass(word: string, cls: VerbClass, form: VerbForm): string | null {
  if (cls === "ichidan") return null; // godan rules on a ichidan verb look like 食べって, which nobody would pick
  if (!word.endsWith("る")) return null;
  // A godan る-verb treated as ichidan (帰る → 帰て), the classic mistake.
  return conjugateVerb(word, "ichidan", form);
}

export function conjugateAdjective(word: string, form: AdjForm): string {
  const stem = word.slice(0, -1);
  return stem + { te: "くて", nai: "くない", ta: "かった", adverb: "く" }[form];
}

/** い-adjectives the drill can use: plain …い words except いい/よい, which are irregular. */
export function usableAdjective(word: string, pos: string | undefined): boolean {
  return pos === "adj-i" && word.length >= 2 && word.endsWith("い") && !/^(いい|良い|よい)$/.test(word);
}
