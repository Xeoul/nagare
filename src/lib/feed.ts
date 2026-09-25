import type { Content, Fact, GrammarPoint, Level, Story, Word } from "./content";
import type { Progress } from "./progress";

export type WordQuizMode = "meaning" | "reading" | "reverse";

export type Card =
  | { id: number; kind: "word"; word: Word }
  | { id: number; kind: "grammar"; point: GrammarPoint }
  | { id: number; kind: "fact"; fact: Fact; index: number }
  | { id: number; kind: "story"; story: Story; storyIndex: number; line: number }
  | {
      id: number;
      kind: "quiz-word";
      itemId: string;
      key: string;
      mode: WordQuizMode;
      prompt: string;
      options: string[];
      answer: string;
    }
  | { id: number; kind: "quiz-grammar"; itemId: string; point: GrammarPoint; options: string[] };

/**
 * The rhythm of the feed: lessons interleaved so it never feels like a
 * vocab drill. Stories come in pairs so each visit moves the plot along.
 * Quizzes are slotted in between whenever something is due (see next()).
 */
const PATTERN = ["word", "story", "story", "word", "grammar", "word", "story", "story", "fact"] as const;

/** At least this many lesson cards between quizzes, so reviews don't crowd out new material. */
const MIN_GAP_BETWEEN_QUIZZES = 2;

const KANJI = /[一-鿿㐀-䶿々]/;

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function byLevel<T extends { level: Level }>(items: T[], level: Level): T[] {
  return [...items.filter((i) => i.level === level), ...items.filter((i) => i.level !== level)];
}

/**
 * Builds cards on demand as you scroll. Holds its own "planned" position
 * for stories and facts, separate from the saved one in Progress: cards
 * are planned a few ahead of what you've actually seen, and only a card
 * you've scrolled to moves the saved position — so reloading never skips
 * something you were shown but didn't reach.
 */
export function createPlanner(content: Content, getProgress: () => Progress) {
  let serial = 0;
  let slot = 0;
  let sinceQuiz = MIN_GAP_BETWEEN_QUIZZES;
  const { cursor } = getProgress();
  let storyPos = { story: cursor.story, line: cursor.line };
  let factPos = cursor.fact;
  /**
   * Lessons already planned. Kept for good (not just while buffered): the
   * item only shows up in Progress once its card is scrolled to, and
   * planning can run before that lands.
   */
  const planned = new Set<string>();
  /** Items with a quiz sitting in the buffer, not yet reached. */
  const queued = new Set<string>();
  /** Recently quizzed, so an item doesn't come back twice in quick succession when practicing ahead. */
  const recent: string[] = [];

  const wordByKey = new Map(content.words.map((w) => [w.key, w]));

  function orderedWords() {
    return byLevel(content.words, getProgress().level);
  }

  function nextNewWord(): Word | null {
    const { items } = getProgress();
    return orderedWords().find((w) => !items[`w:${w.key}`] && !planned.has(`w:${w.key}`)) ?? null;
  }

  function nextNewGrammar(): GrammarPoint | null {
    const { items } = getProgress();
    return (
      byLevel(content.grammar, getProgress().level).find(
        (g) => !items[`g:${g.id}`] && !planned.has(`g:${g.id}`),
      ) ?? null
    );
  }

  function orderedStories() {
    return byLevel(content.stories, getProgress().level);
  }

  function pickDue(practiceAhead: boolean): string | null {
    const now = Date.now();
    const candidates = Object.entries(getProgress().items)
      .filter(([id]) => !queued.has(id) && !recent.includes(id))
      .filter(([id]) => id.startsWith("g:") || glossFor(id.slice(2)))
      .filter(([, state]) => practiceAhead || state.due <= now)
      .sort((a, b) => a[1].due - b[1].due);
    return candidates[0]?.[0] ?? null;
  }

  function glossFor(key: string) {
    const word = wordByKey.get(key);
    if (word) return { r: word.reading, m: word.meaning, p: word.pos };
    return content.glossary[key] ?? null;
  }

  function wordQuiz(itemId: string): Card | null {
    const key = itemId.slice(2);
    const gloss = glossFor(key);
    if (!gloss) return null;
    const state = getProgress().items[itemId];
    const attempts = state ? state.right + state.wrong : 0;
    const hasKanji = KANJI.test(key);

    let mode: WordQuizMode = "meaning";
    if (state && state.stage >= 1) {
      const modes: WordQuizMode[] = hasKanji ? ["reading", "reverse", "meaning"] : ["reverse", "meaning"];
      mode = modes[attempts % modes.length];
    }

    const pool = content.words.filter((w) => w.key !== key);
    const samePos = pool.filter((w) => w.pos === gloss.p);
    const others = shuffle(samePos.length >= 6 ? samePos : pool);

    const pick = (value: (w: Word) => string, answer: string) => {
      const seen = new Set([answer]);
      const distractors: string[] = [];
      for (const w of others) {
        const v = value(w);
        if (seen.has(v)) continue;
        seen.add(v);
        distractors.push(v);
        if (distractors.length === 3) break;
      }
      return shuffle([answer, ...distractors]);
    };

    if (mode === "reading") {
      const answer = gloss.r.split("・")[0];
      // Readings of other kanji words, so the options all look plausible.
      const readingPool = others.filter((w) => KANJI.test(w.key));
      const seen = new Set([answer]);
      const distractors = readingPool
        .map((w) => w.reading.split("・")[0])
        .filter((r) => !seen.has(r) && (seen.add(r), true))
        .slice(0, 3);
      return {
        id: serial++,
        kind: "quiz-word",
        itemId,
        key,
        mode,
        prompt: key,
        options: shuffle([answer, ...distractors]),
        answer,
      };
    }
    if (mode === "reverse") {
      return {
        id: serial++,
        kind: "quiz-word",
        itemId,
        key,
        mode,
        prompt: gloss.m,
        options: pick((w) => w.key, key),
        answer: key,
      };
    }
    return {
      id: serial++,
      kind: "quiz-word",
      itemId,
      key,
      mode,
      prompt: key,
      options: pick((w) => w.meaning, gloss.m),
      answer: gloss.m,
    };
  }

  function quizFor(itemId: string): Card | null {
    if (itemId.startsWith("g:")) {
      const point = content.grammar.find((g) => `g:${g.id}` === itemId);
      if (!point) return null;
      return { id: serial++, kind: "quiz-grammar", itemId, point, options: shuffle(point.quiz.options) };
    }
    return wordQuiz(itemId);
  }

  function lesson(kind: (typeof PATTERN)[number]): Card | null {
    if (kind === "word") {
      const word = nextNewWord();
      if (!word) return null;
      planned.add(`w:${word.key}`);
      return { id: serial++, kind: "word", word };
    }
    if (kind === "grammar") {
      const point = nextNewGrammar();
      if (!point) return null;
      planned.add(`g:${point.id}`);
      return { id: serial++, kind: "grammar", point };
    }
    if (kind === "fact") {
      if (content.facts.length === 0) return null;
      const index = factPos % content.facts.length;
      factPos = index + 1;
      return { id: serial++, kind: "fact", fact: content.facts[index], index };
    }
    const stories = orderedStories();
    if (stories.length === 0) return null;
    let storyIndex = storyPos.story % stories.length;
    let line = storyPos.line;
    if (line >= stories[storyIndex].sentences.length) {
      storyIndex = (storyIndex + 1) % stories.length;
      line = 0;
    }
    storyPos = { story: storyIndex, line: line + 1 };
    return { id: serial++, kind: "story", story: stories[storyIndex], storyIndex, line };
  }

  /** Plans the next card. */
  function next(): Card {
    // A story pair shouldn't be split by a quiz.
    const midStory = PATTERN[slot % PATTERN.length] === "story" && PATTERN[(slot - 1 + PATTERN.length) % PATTERN.length] === "story";

    if (sinceQuiz >= MIN_GAP_BETWEEN_QUIZZES && !midStory) {
      const due = pickDue(false);
      const card = due ? quizFor(due) : null;
      if (card && due) {
        sinceQuiz = 0;
        queued.add(due);
        return card;
      }
    }

    // Try each lesson type in pattern order until one has something left.
    for (let i = 0; i < PATTERN.length; i++) {
      const kind = PATTERN[slot % PATTERN.length];
      slot++;
      const card = lesson(kind);
      if (card) {
        sinceQuiz++;
        return card;
      }
    }

    // Every word and grammar point has been introduced and nothing's due:
    // practice whatever's coming up soonest.
    const ahead = pickDue(true);
    const card = ahead ? quizFor(ahead) : null;
    if (card && ahead) {
      queued.add(ahead);
      return card;
    }
    return lesson("fact") ?? lesson("story")!;
  }

  /** Call when a quiz card is reached, so its item can be quizzed again later. */
  function settle(itemId: string) {
    queued.delete(itemId);
    recent.push(itemId);
    if (recent.length > 4) recent.shift();
  }

  return { next, settle, storyCount: () => orderedStories().length };
}

export type Planner = ReturnType<typeof createPlanner>;
