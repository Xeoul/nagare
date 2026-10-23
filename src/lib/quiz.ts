import {
  ADJ_FORMS,
  conjugateAdjective,
  conjugateVerb,
  conjugateWrongClass,
  usableAdjective,
  verbClass,
  VERB_FORMS,
} from "@/lib/conjugation";
import { GRAMMAR_QUESTIONS } from "@/data/grammar-quiz";
import { READING_QUESTIONS } from "@/data/reading-quiz";
import { getProgress, statusOf } from "@/lib/progress";
import { STARTER_READINGS } from "@/data/starter-readings";
import {
  loadLevel,
  LEVELS,
  type KanjiItem,
  type Level,
  type LevelData,
  type VocabItem,
} from "@/lib/jlpt-data";

export { LEVELS };
export type { Level };

// JLPT-style multiple choice. The format follows the exam's own sections
// (language knowledge: kanji reading, orthography, contextually-defined
// words, paraphrase; grammar: selecting the right form) but every question is
// generated from open data (src/lib/jlpt-data.ts) or written for Nagare
// (src/data/grammar-quiz.ts). The JLPT's real test questions are copyrighted,
// so none are reproduced here.

export type Mode = "mixed" | "vocab" | "reading" | "grammar" | "passage" | "conjugation";

type Kind = "conjugation" | "comprehension" | "meaning" | "context" | "reading" | "orthography" | "kanjiMeaning" | "kanjiReading" | "form" | "gmeaning";

export type Question = {
  kind: Kind;
  /** Which exam section it belongs to, for the mock test's scoring. */
  section: "vocab" | "grammar" | "reading";
  level: Level;
  /** The passage to read first, for reading-comprehension questions. */
  passage?: string;
  /** Progress key of the word, kanji or grammar point it tests (see lib/progress.ts). */
  item?: string;
  /** What's asked, e.g. "How do you read the underlined word?" */
  prompt: string;
  /** The thing asked about. Text inside [[ ]] is shown underlined, like on the exam. */
  stem: string;
  /** Spoken/ruby reading shown after answering, for word questions. */
  reading?: string;
  choices: string[];
  answer: number;
  /** Shown after answering: the right answer explained. */
  explanation: string;
};

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const KANJI = /[一-鿿]/;
const hasKanji = (text: string) => KANJI.test(text);
const pick = <T>(items: readonly T[]): T | undefined => items[Math.floor(Math.random() * items.length)];

/** Progress keys a quiz is limited to; null for an ordinary quiz. */
let scope: Set<string> | null = null;

const vocabKey = (v: VocabItem) => `v:${v.w}`;
const kanjiKey = (k: KanjiItem) => `k:${k.c}`;

/**
 * Narrows a pool to one progress tier, so quizzes lean on what you got wrong
 * or have just studied, with fresh and mastered items still mixed in.
 */
function focus<T>(pool: readonly T[], key: (item: T) => string): T[] {
  // A unit check only asks about that unit's own items.
  if (scope) return pool.filter((item) => scope?.has(key(item)));
  const progress = getProgress();
  const order = { weak: 0, learning: 1, new: 2, mastered: 3 } as const;
  const tiers: T[][] = [[], [], [], []];
  for (const item of pool) tiers[order[statusOf(progress[key(item)])]].push(item);
  // Material you haven't met yet is the rarest pick, so quizzes stay on what you've studied.
  const weights = [4, 4, 1, 1].map((w, i) => (tiers[i].length ? w : 0));
  let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < tiers.length; i++) {
    roll -= weights[i];
    if (roll < 0) return tiers[i];
  }
  return [...pool];
}

/** Picks `count` items that differ from the correct one (and each other) by `key`. */
function distractors<T>(pool: readonly T[], key: (item: T) => string, forbidden: Set<string>, count = 3): T[] | null {
  const seen = new Set(forbidden);
  const out: T[] = [];
  for (const item of shuffle(pool)) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
    if (out.length === count) return out;
  }
  return null;
}

function make(
  base: Omit<Question, "choices" | "answer">,
  correct: string,
  wrong: string[],
): Question {
  const choices = shuffle([correct, ...wrong]);
  return { ...base, choices, answer: choices.indexOf(correct) };
}

/** An example sentence of the word that contains it exactly as written. */
function verbatimExample(item: VocabItem) {
  return item.e.find((x) => x.j.includes(item.w) && x.j.split(item.w).length === 2);
}

const shorten = (text: string, max = 60) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

// ───────── vocabulary and kanji ─────────

function meaningQuestion(d: LevelData): Question | null {
  const word = pick(focus(d.vocab.filter((v) => v.m[0] && v.m[0].length <= 38), vocabKey));
  if (!word) return null;
  // Same part of speech first, so "to eat" isn't the only verb among nouns.
  const similar = d.vocab.filter((v) => v.p === word.p && v.m[0]);
  const wrong = distractors(similar.length >= 12 ? similar : d.vocab, (v) => v.m[0] ?? "", new Set([word.m[0]]));
  if (!wrong) return null;
  return make(
    {
      kind: "meaning",
      item: vocabKey(word),
      section: "vocab",
      level: d.level,
      prompt: "What does this word mean?",
      stem: word.w,
      reading: word.r,
      explanation: `${word.w}${hasKanji(word.w) ? `（${word.r}）` : ""} = ${word.m.join("; ")}`,
    },
    word.m[0],
    wrong.map((v) => v.m[0]),
  );
}

function readingQuestion(d: LevelData): Question | null {
  const word = pick(focus(d.vocab.filter((v) => hasKanji(v.w)), vocabKey));
  if (!word) return null;
  const example = verbatimExample(word);
  const pool = d.vocab.filter((v) => hasKanji(v.w) && Math.abs(v.r.length - word.r.length) <= 1);
  const wrong = distractors(pool.length >= 8 ? pool : d.vocab, (v) => v.r, new Set([word.r]));
  if (!wrong) return null;
  return make(
    {
      kind: "reading",
      item: vocabKey(word),
      section: "vocab",
      level: d.level,
      prompt: "How do you read the underlined word?",
      stem: example ? example.j.replace(word.w, `[[${word.w}]]`) : `[[${word.w}]]`,
      reading: word.r,
      explanation: `${word.w}（${word.r}）= ${word.m.join("; ")}${example ? `\n${example.j}\n${example.en}` : ""}`,
    },
    word.r,
    wrong.map((v) => v.r),
  );
}

function orthographyQuestion(d: LevelData): Question | null {
  const word = pick(focus(d.vocab.filter((v) => hasKanji(v.w) && verbatimExample(v)), vocabKey));
  const example = word && verbatimExample(word);
  if (!word || !example) return null;
  // Look-alikes: other words that share a kanji or have the same length, but
  // never one with the same reading (that would be a second right answer).
  const kanji = [...word.w].filter(hasKanji);
  const pool = d.vocab.filter((v) => hasKanji(v.w) && v.r !== word.r);
  const similar = pool.filter((v) => [...v.w].some((ch) => kanji.includes(ch)));
  const near = pool.filter((v) => v.w.length === word.w.length);
  const wrong = distractors(similar.length >= 6 ? similar : near.length >= 6 ? near : pool, (v) => v.w, new Set([word.w]));
  if (!wrong) return null;
  return make(
    {
      kind: "orthography",
      item: vocabKey(word),
      section: "vocab",
      level: d.level,
      prompt: "Choose the correct way to write the underlined word.",
      stem: example.j.replace(word.w, `[[${word.r}]]`),
      explanation: `${word.w}（${word.r}）= ${word.m.join("; ")}\n${example.j}\n${example.en}`,
    },
    word.w,
    wrong.map((v) => v.w),
  );
}

function contextQuestion(d: LevelData): Question | null {
  const word = pick(focus(d.vocab.filter((v) => v.p && verbatimExample(v)), vocabKey));
  const example = word && verbatimExample(word);
  if (!word || !example) return null;
  const pool = d.vocab.filter((v) => v.p === word.p && v.r !== word.r);
  const wrong = distractors(pool.length >= 10 ? pool : d.vocab.filter((v) => v.r !== word.r), (v) => v.w, new Set([word.w]));
  if (!wrong) return null;
  return make(
    {
      kind: "context",
      item: vocabKey(word),
      section: "vocab",
      level: d.level,
      prompt: "Choose the best word to fill the gap.",
      stem: example.j.replace(word.w, "＿＿"),
      explanation: `${example.j}\n${example.en}\n${word.w}${hasKanji(word.w) ? `（${word.r}）` : ""} = ${word.m.join("; ")}`,
    },
    word.w,
    wrong.map((v) => v.w),
  );
}

const readingsOf = (k: KanjiItem) => [...k.on, ...k.kun].map((r) => r.replace(/[.\-]/g, ""));

function kanjiMeaningQuestion(d: LevelData): Question | null {
  const kanji = pick(focus(d.kanji.filter((k) => k.m[0]), kanjiKey));
  if (!kanji) return null;
  const label = (k: KanjiItem) => k.m.slice(0, 2).join(", ");
  const wrong = distractors(d.kanji.filter((k) => k.m[0]), (k) => k.m[0], new Set([kanji.m[0]]));
  if (!wrong) return null;
  return make(
    {
      kind: "kanjiMeaning",
      item: kanjiKey(kanji),
      section: "vocab",
      level: d.level,
      prompt: "What does this kanji mean?",
      stem: kanji.c,
      explanation: `${kanji.c}: ${kanji.m.join(", ")}\nOn: ${kanji.on.join("、") || "—"}  Kun: ${kanji.kun.join("、") || "—"}${
        kanji.w.length ? `\nWords: ${kanji.w.join("、")}` : ""
      }`,
    },
    label(kanji),
    wrong.map(label),
  );
}

function kanjiReadingQuestion(d: LevelData): Question | null {
  const kanji = pick(focus(d.kanji.filter((k) => readingsOf(k).length > 0), kanjiKey));
  if (!kanji) return null;
  const own = new Set(readingsOf(kanji));
  const correct = pick(readingsOf(kanji));
  if (!correct) return null;
  const others = d.kanji.flatMap(readingsOf).filter((r) => !own.has(r));
  const wrong = distractors(
    // Same script (katakana on, hiragana kun) so the answer isn't obvious.
    others.filter((r) => /^[゠-ヿ]+$/.test(r) === /^[゠-ヿ]+$/.test(correct)),
    (r) => r,
    new Set(),
  );
  if (!wrong) return null;
  return make(
    {
      kind: "kanjiReading",
      item: kanjiKey(kanji),
      section: "vocab",
      level: d.level,
      prompt: "Which of these is a reading of this kanji?",
      stem: kanji.c,
      explanation: `${kanji.c}: ${kanji.m.join(", ")}\nOn: ${kanji.on.join("、") || "—"}  Kun: ${kanji.kun.join("、") || "—"}${
        kanji.w.length ? `\nWords: ${kanji.w.join("、")}` : ""
      }`,
    },
    correct,
    wrong,
  );
}

// ───────── grammar ─────────

/** The literal text a pattern like 〜ことにしている looks like inside a sentence. */
function cores(pattern: string): string[] {
  return pattern
    .replace(/（[^）]*）/g, "")
    .split("/")
    .map((part) => part.trim().replace(/^〜+|〜+$/g, ""))
    .filter((core) => core.length >= 2 && !/[〜(（]/.test(core));
}

/** Conjugation drill: verbs by group and い-adjectives, with the classic wrong answers as distractors. */
function conjugationQuestion(d: LevelData): Question | null {
  const verbs = d.vocab.filter((v) => verbClass(v.w, v.p));
  const adjectives = d.vocab.filter((v) => usableAdjective(v.w, v.p));
  const useAdj = adjectives.length > 0 && (verbs.length === 0 || Math.random() < 0.25);
  if (useAdj) {
    const word = pick(adjectives);
    if (!word) return null;
    const form = pick(ADJ_FORMS);
    if (!form) return null;
    const correct = conjugateAdjective(word.w, form.id);
    const wrong = [...new Set(ADJ_FORMS.filter((f) => f.id !== form.id).map((f) => conjugateAdjective(word.w, f.id)))].filter((c) => c !== correct);
    // The easy-to-make mistakes: keeping the い, or using だ like a な-adjective.
    wrong.push(word.w.slice(0, -1) + "いくない", word.w + "だった");
    const options = shuffle([...new Set(wrong)].filter((c) => c !== correct)).slice(0, 3);
    if (options.length < 3) return null;
    return make(
      {
        kind: "conjugation",
        section: "grammar",
        level: d.level,
        prompt: `Choose the correct ${form.label} of this い-adjective.`,
        stem: `${word.w}（${word.r}）`,
        explanation: `${word.w} → ${correct}\nい-adjectives: drop い and add くて / くない / かった / く.\n${word.w} = ${word.m.join("; ")}`,
      },
      correct,
      options,
    );
  }
  const word = pick(verbs);
  const cls = word && verbClass(word.w, word.p);
  const form = pick(VERB_FORMS);
  if (!word || !cls || !form) return null;
  const correct = conjugateVerb(word.w, cls, form.id);
  const wrong = new Set<string>();
  const trap = conjugateWrongClass(word.w, cls, form.id);
  if (trap) wrong.add(trap);
  for (const f of shuffle(VERB_FORMS.filter((x) => x.id !== form.id))) wrong.add(conjugateVerb(word.w, cls, f.id));
  const options = shuffle([...wrong].filter((c) => c !== correct)).slice(0, 3);
  if (options.length < 3) return null;
  const how =
    cls === "ichidan"
      ? "Group 2 (る-verb): drop る, then add the ending."
      : "Group 1 (う-verb): the last kana changes (て/た: く→いて, ぐ→いで, す→して, つ・る・う→って, ぬ・ぶ・む→んで).";
  return make(
    {
      kind: "conjugation",
      section: "grammar",
      level: d.level,
      prompt: `Choose the correct ${form.label} of this verb.`,
      stem: `${word.w}（${word.r}）`,
      explanation: `${word.w} → ${correct}\n${how}\n${word.w} = ${word.m.join("; ")}`,
    },
    correct,
    options,
  );
}

function formQuestion(d: LevelData): Question | null {
  const usable = d.grammar.flatMap((g) =>
    g.e.flatMap((example) => {
      const core = cores(g.p).find((c) => example.j.split(c).length === 2);
      return core ? [{ g, example, core }] : [];
    }),
  );
  const chosen = pick(focus(usable, (x) => `g:${x.g.id}`));
  if (!chosen) return null;
  const { g, example, core } = chosen;
  // Wrong answers come from other patterns of the level that don't share a
  // tag or overlap the right answer, so only one choice really fits.
  const pool = d.grammar
    .filter((o) => o.id !== g.id && !o.t.some((tag) => g.t.includes(tag)))
    .flatMap((o) => cores(o.p).map((c) => ({ o, c })))
    .filter(({ c }) => !c.includes(core) && !core.includes(c) && !example.j.includes(c));
  const wrong = distractors(pool, (x) => x.c, new Set([core]));
  if (!wrong) return null;
  return make(
    {
      kind: "form",
      item: `g:${g.id}`,
      section: "grammar",
      level: d.level,
      prompt: "Choose the expression that fits the gap.",
      stem: example.j.replace(core, "＿＿"),
      explanation: `${example.j}\n${example.en}\n${g.p}: ${g.m}\n${g.f}${g.n ? `\n${g.n}` : ""}`,
    },
    core,
    wrong.map((x) => x.c),
  );
}

function grammarMeaningQuestion(d: LevelData): Question | null {
  const item = pick(focus(d.grammar.filter((g) => g.m), (g) => `g:${g.id}`));
  if (!item) return null;
  const wrong = distractors(d.grammar.filter((g) => g.m), (g) => shorten(g.m), new Set([shorten(item.m)]));
  if (!wrong) return null;
  const first = item.e[0];
  return make(
    {
      kind: "gmeaning",
      item: `g:${item.id}`,
      section: "grammar",
      level: d.level,
      prompt: "What does this grammar pattern express?",
      stem: item.p,
      explanation: `${item.p}: ${item.m}\n${item.f}${first ? `\n${first.j}\n${first.en}` : ""}${item.n ? `\n${item.n}` : ""}`,
    },
    shorten(item.m),
    wrong.map((g) => shorten(g.m)),
  );
}

function handwrittenGrammar(level: Level): Question[] {
  return GRAMMAR_QUESTIONS.filter((q) => q.level === level).map((q) => {
    const order = shuffle([0, 1, 2, 3]);
    return {
      kind: "form" as const,
      section: "grammar" as const,
      level,
      prompt: "Choose the word or form that fits the gap.",
      stem: q.sentence,
      choices: order.map((i) => q.choices[i]),
      answer: order.indexOf(q.answer),
      explanation: `${q.sentence.replace("＿＿", q.choices[q.answer])}\n${q.gloss}\n${q.why}`,
    };
  });
}

// ───────── building quizzes ─────────

/** Reading-comprehension questions from the graded readings, whole passages at a time. */
function comprehension(level: Level, count: number): Question[] {
  const out: Question[] = [];
  for (const reading of shuffle(STARTER_READINGS.filter((r) => r.level === level))) {
    for (const item of READING_QUESTIONS[reading.title] ?? []) {
      const order = shuffle([0, 1, 2, 3]);
      out.push({
        kind: "comprehension",
        item: `p:${reading.title}`,
        section: "reading",
        level,
        passage: reading.text,
        prompt: reading.title,
        stem: item.q,
        choices: order.map((i) => item.choices[i]),
        answer: order.indexOf(0),
        explanation: item.why,
      });
    }
    if (out.length >= count) break;
  }
  return out;
}

const GENERATORS: Record<Kind, (d: LevelData) => Question | null> = {
  comprehension: () => null,
  conjugation: conjugationQuestion,
  meaning: meaningQuestion,
  context: contextQuestion,
  reading: readingQuestion,
  orthography: orthographyQuestion,
  kanjiMeaning: kanjiMeaningQuestion,
  kanjiReading: kanjiReadingQuestion,
  form: formQuestion,
  gmeaning: grammarMeaningQuestion,
};

const MODE_KINDS: Record<Mode, Kind[]> = {
  vocab: ["meaning", "context", "meaning", "context"],
  reading: ["reading", "orthography", "kanjiMeaning", "reading", "kanjiReading", "orthography"],
  grammar: ["form", "form", "gmeaning"],
  passage: [],
  conjugation: ["conjugation"],
  mixed: ["meaning", "form", "reading", "context", "form", "orthography", "kanjiMeaning", "gmeaning", "conjugation"],
};

/** Fills a list with `count` distinct questions following the order of `kinds`. */
function fill(d: LevelData, kinds: Kind[], count: number, seed: Question[] = []): Question[] {
  const out = [...seed];
  const seen = new Set(out.map((q) => q.stem));
  let guard = 0;
  while (out.length < count && guard++ < count * 40) {
    const kind = kinds[(out.length + guard) % kinds.length];
    const q = GENERATORS[kind](d);
    if (!q || seen.has(q.stem)) continue;
    seen.add(q.stem);
    out.push(q);
  }
  return out;
}

/** A practice round of `count` questions, or null if the level's data couldn't load. */
export async function buildQuiz(mode: Mode, level: Level, count = 10): Promise<Question[] | null> {
  if (mode === "passage") {
    const qs = comprehension(level, count);
    return qs.length ? qs : null;
  }
  const data = await loadLevel(level);
  if (!data) return null;
  // Grammar practice starts from the hand-written questions where the level has them.
  const seed = mode === "grammar" ? shuffle(handwrittenGrammar(level)).slice(0, Math.ceil(count / 2)) : [];
  const out = fill(data, MODE_KINDS[mode], count, seed);
  return out.length ? shuffle(out) : null;
}

/** A short check on one unit's words, kanji and grammar. */
export async function buildUnitQuiz(level: Level, keys: string[], count = 8): Promise<Question[] | null> {
  const data = await loadLevel(level);
  if (!data) return null;
  scope = new Set(keys);
  try {
    const out = fill(data, ["meaning", "gmeaning", "kanjiMeaning", "form", "context", "kanjiReading", "reading", "meaning"], count);
    return out.length >= Math.min(4, count) ? shuffle(out) : null;
  } finally {
    scope = null;
  }
}

export type MockSection = { id: "vocab" | "grammar" | "reading"; title: string; minutes: number; questions: Question[] };

// Minutes per section, scaled down from the real exam's time limits to the
// shorter question counts used here.
const MOCK_MINUTES: Record<Level, { vocab: number; grammar: number; reading: number }> = {
  N5: { vocab: 12, grammar: 10, reading: 8 },
  N4: { vocab: 14, grammar: 12, reading: 10 },
  N3: { vocab: 17, grammar: 14, reading: 12 },
  N2: { vocab: 20, grammar: 16, reading: 14 },
  N1: { vocab: 22, grammar: 18, reading: 16 },
};

/**
 * A timed mock test laid out like the exam's Language Knowledge section:
 * vocabulary first (kanji reading, orthography, contextually-defined words,
 * paraphrase-style meanings), then grammar (selecting the right form), then
 * reading comprehension on short passages.
 */
export async function buildMock(level: Level): Promise<MockSection[] | null> {
  const data = await loadLevel(level);
  if (!data) return null;
  const vocabKinds: Kind[] = ["reading", "reading", "orthography", "context", "context", "meaning", "kanjiMeaning"];
  const vocab = fill(data, vocabKinds, 20);
  const grammar = fill(data, ["form"], 15, shuffle(handwrittenGrammar(level)).slice(0, 8));
  if (vocab.length < 10 || grammar.length < 5) return null;
  const reading = comprehension(level, 5);
  return [
    { id: "vocab", title: "Language Knowledge: Vocabulary", minutes: MOCK_MINUTES[level].vocab, questions: vocab },
    { id: "grammar", title: "Language Knowledge: Grammar", minutes: MOCK_MINUTES[level].grammar, questions: grammar },
    ...(reading.length ? [{ id: "reading" as const, title: "Reading", minutes: MOCK_MINUTES[level].reading, questions: reading }] : []),
  ];
}
