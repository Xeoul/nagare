import { GRAMMAR_QUESTIONS } from "@/data/grammar-quiz";
import { assetUrl } from "@/lib/base-path";
import { loadDictionary, type JmdictEntry } from "@/lib/dictionary";

// JLPT-style multiple choice, built on the data the app already ships: the
// JLPT word lists (public/dictionary/jlpt-levels.json) joined to JMdict for
// readings and meanings, plus the hand-written grammar questions in
// src/data/grammar-quiz.ts. Nothing here needs a network after the first load.

export type Level = "N5" | "N4" | "N3" | "N2" | "N1";
export const LEVELS: Level[] = ["N5", "N4", "N3", "N2", "N1"];
/** Grammar questions are written for these levels only. */
export const GRAMMAR_LEVELS: Level[] = ["N5", "N4", "N3"];

export type Mode = "mixed" | "vocab" | "reading" | "grammar";

export type Question = {
  kind: "vocab" | "reading" | "grammar";
  level: Level;
  /** What's asked, e.g. "What does this word mean?" */
  prompt: string;
  /** The thing being asked about: a word, or a sentence with a gap. */
  stem: string;
  /** Furigana-style reading shown under the stem once answered (vocab only). */
  reading?: string;
  choices: string[];
  answer: number;
  /** Shown after answering: the right answer explained. */
  explanation: string;
};

type Word = { form: string; reading: string; meaning: string; pos: string; level: Level; hasKanji: boolean };

const KANJI = /[一-鿿]/;

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const toHiragana = (text: string) =>
  text.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));

let wordsPromise: Promise<Record<Level, Word[]> | null> | null = null;

/** Joins the level lists to the dictionary; cached after the first call. */
export function loadWords(): Promise<Record<Level, Word[]> | null> {
  wordsPromise ??= (async () => {
    const [dict, levelsRes] = await Promise.all([loadDictionary(), fetch(assetUrl("/dictionary/jlpt-levels.json"))]);
    if (!dict || !levelsRes.ok) return null;
    const levels = (await levelsRes.json()) as Record<string, Level>;
    const byLevel: Record<Level, Word[]> = { N5: [], N4: [], N3: [], N2: [], N1: [] };
    for (const [key, level] of Object.entries(levels)) {
      if (!byLevel[level]) continue;
      // Keys can list several writings: "足; 脚". Prefer one that has a kanji.
      const forms = key.split(";").map((f) => f.trim()).filter(Boolean);
      const form = forms.find((f) => KANJI.test(f)) ?? forms[0];
      const raw = dict[form] ?? forms.map((f) => dict[f]).find(Boolean);
      const entry: JmdictEntry | undefined = Array.isArray(raw) ? raw[0] : raw;
      const meaning = entry?.meanings[0];
      if (!entry || !meaning || meaning.length > 38) continue;
      byLevel[level].push({
        form,
        reading: toHiragana(entry.reading),
        meaning,
        pos: entry.pos.split(/[ ,(]/)[0] ?? "",
        level,
        hasKanji: KANJI.test(form),
      });
    }
    return byLevel;
  })().catch(() => null);
  return wordsPromise;
}

function distractors<T>(pool: readonly T[], correct: T, key: (item: T) => string, count = 3): T[] {
  const seen = new Set([key(correct)]);
  const out: T[] = [];
  for (const item of shuffle(pool)) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
    if (out.length === count) break;
  }
  return out;
}

function vocabQuestion(word: Word, pool: Word[]): Question | null {
  // Same part of speech first, so “to eat” isn't the only verb among nouns.
  const similar = pool.filter((w) => w.pos === word.pos);
  const others = distractors(similar.length >= 12 ? similar : pool, word, (w) => w.meaning);
  if (others.length < 3) return null;
  const options = shuffle([word, ...others]);
  return {
    kind: "vocab",
    level: word.level,
    prompt: "What does this word mean?",
    stem: word.form,
    reading: word.reading,
    choices: options.map((w) => w.meaning),
    answer: options.indexOf(word),
    explanation: `${word.form}${word.hasKanji ? `（${word.reading}）` : ""} = ${word.meaning}`,
  };
}

function readingQuestion(word: Word, pool: Word[]): Question | null {
  // Readings of similar length look alike, which makes the distractors fair.
  const similar = pool.filter((w) => w.hasKanji && Math.abs(w.reading.length - word.reading.length) <= 1);
  const others = distractors(similar.length >= 8 ? similar : pool.filter((w) => w.hasKanji), word, (w) => w.reading);
  if (others.length < 3) return null;
  const options = shuffle([word, ...others]);
  return {
    kind: "reading",
    level: word.level,
    prompt: "How do you read this word?",
    stem: word.form,
    reading: word.reading,
    choices: options.map((w) => w.reading),
    answer: options.indexOf(word),
    explanation: `${word.form}（${word.reading}）means “${word.meaning}”.`,
  };
}

function grammarQuestions(level: Level): Question[] {
  return GRAMMAR_QUESTIONS.filter((q) => q.level === level).map((q) => {
    const order = shuffle([0, 1, 2, 3]);
    return {
      kind: "grammar" as const,
      level,
      prompt: "Choose the word or form that fits the gap.",
      stem: q.sentence,
      choices: order.map((i) => q.choices[i]),
      answer: order.indexOf(q.answer),
      explanation: `${q.sentence.replace("＿＿", q.choices[q.answer])}\n${q.gloss}\n${q.why}`,
    };
  });
}

/**
 * Builds a quiz of `count` questions. Mixed mode alternates vocabulary,
 * reading and (where the level has them) grammar. Resolves to null if the word
 * data couldn't load; grammar-only mode doesn't need it.
 */
export async function buildQuiz(mode: Mode, level: Level, count = 10): Promise<Question[] | null> {
  const grammar = shuffle(grammarQuestions(level));
  if (mode === "grammar") return grammar.slice(0, count);

  const words = await loadWords();
  if (!words) return mode === "mixed" && grammar.length ? grammar.slice(0, count) : null;
  const pool = words[level];
  const kanjiWords = pool.filter((w) => w.hasKanji);

  const make = (kind: "vocab" | "reading"): Question | null => {
    const source = kind === "reading" ? kanjiWords : pool;
    const word = source[Math.floor(Math.random() * source.length)];
    return word ? (kind === "vocab" ? vocabQuestion(word, pool) : readingQuestion(word, pool)) : null;
  };

  const seen = new Set<string>();
  const out: Question[] = [];
  const kinds: ("vocab" | "reading" | "grammar")[] =
    mode === "vocab" ? ["vocab"] : mode === "reading" ? ["reading"] : grammar.length ? ["vocab", "grammar", "reading"] : ["vocab", "reading"];
  let guard = 0;
  while (out.length < count && guard++ < count * 20) {
    const kind = kinds[out.length % kinds.length];
    const q = kind === "grammar" ? grammar.shift() ?? null : make(kind);
    if (!q || seen.has(q.stem + q.kind)) continue;
    seen.add(q.stem + q.kind);
    out.push(q);
  }
  return out.length ? out : null;
}
