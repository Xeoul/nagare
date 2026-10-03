import { STARTER_READINGS } from "@/data/starter-readings";
import { CLASSICS, fetchClassicText } from "./aozora";
import { WIKIBOOKS_READERS, fetchReaderText } from "./wikibooks-readers";
import type { LibraryItem } from "./library";

export type FeedLevel = "N5" | "N4" | "N3+";
export const FEED_LEVELS: FeedLevel[] = ["N5", "N4", "N3+"];

export type FeedSource = {
  key: string;
  title: string;
  subtitle: string;
  kind: LibraryItem["kind"];
  level: FeedLevel;
  loadText: () => Promise<string>;
};

export type FeedSentence = {
  text: string;
  source: FeedSource;
  /** Position of this sentence within its source, for "read the full story". */
  index: number;
  total: number;
};

export type FeedCard =
  | { kind: "sentence"; id: string; sentence: FeedSentence }
  | { kind: "word"; id: string; sentence: FeedSentence }
  | { kind: "quiz"; id: string; sentence: FeedSentence };

const SOURCES: FeedSource[] = [
  ...STARTER_READINGS.map(
    (r): FeedSource => ({
      key: `starter:${r.title}`,
      title: r.title,
      subtitle: "Starter reading",
      kind: "starter",
      level: r.level,
      loadText: async () => r.text,
    }),
  ),
  ...WIKIBOOKS_READERS.map(
    (r): FeedSource => ({
      key: `reader:${r.slug}`,
      title: r.title,
      subtitle: r.note,
      kind: "reader",
      level: "N5",
      loadText: () => fetchReaderText(r),
    }),
  ),
  ...CLASSICS.map(
    (w): FeedSource => ({
      key: `classic:${w.slug}`,
      title: w.title,
      subtitle: `${w.author} · ${w.note}`,
      kind: "classic",
      level: "N3+",
      loadText: () => fetchClassicText(w),
    }),
  ),
];

/** Bite-sized: long enough to mean something, short enough to take in at a glance. */
const MIN_CHARS = 6;
const MAX_CHARS = 60;

/**
 * Regex-based rather than tokenizer-based so the feed can be built before
 * the (slow, several-MB) tokenizer dictionary finishes loading. Line breaks
 * are dropped first: several sources hard-wrap mid-sentence, and Japanese
 * has no inter-word spaces for a join to lose.
 */
export function splitSentences(text: string): string[] {
  const flat = text.replace(/\s+/g, "");
  const parts = flat.match(/[^。！？!?]+[。！？!?]*[」』）)]*/g) ?? [];
  return parts
    .map((part) => {
      let s = part.trim();
      // A quote spanning two sentences leaves each half with a dangling bracket.
      if (s.startsWith("「") && !s.includes("」")) s = s.slice(1);
      if (s.endsWith("」") && !s.includes("「")) s = s.slice(0, -1);
      return s;
    })
    .filter((s) => /[぀-ヿ一-鿿]/.test(s));
}

const textCache = new Map<string, Promise<string>>();

export function loadSourceText(source: FeedSource): Promise<string> {
  let cached = textCache.get(source.key);
  if (!cached) {
    cached = source.loadText();
    textCache.set(source.key, cached);
    cached.catch(() => textCache.delete(source.key));
  }
  return cached;
}

export async function loadSentences(level: FeedLevel): Promise<FeedSentence[]> {
  const sources = SOURCES.filter((s) => s.level === level);
  const perSource = await Promise.all(
    sources.map(async (source) => {
      try {
        const all = splitSentences(await loadSourceText(source));
        return all
          .map((text, index) => ({ text, source, index, total: all.length }))
          .filter((s) => s.text.length >= MIN_CHARS && s.text.length <= MAX_CHARS);
      } catch {
        return [];
      }
    }),
  );
  return perSource.flat();
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const WORD_CARD_EVERY = 4;
const QUIZ_CARD_EVERY = 7;
let nextCardId = 0;

/** One shuffled pass over every sentence, with a vocab spotlight and a quiz every few cards. */
export function buildBatch(sentences: FeedSentence[]): FeedCard[] {
  const order = shuffle(sentences);
  const spotlights = shuffle(sentences);
  const cards: FeedCard[] = [];
  order.forEach((sentence, i) => {
    cards.push({ kind: "sentence", id: `c${nextCardId++}`, sentence });
    if ((i + 1) % WORD_CARD_EVERY === 0 && spotlights.length > 0) {
      cards.push({ kind: "word", id: `c${nextCardId++}`, sentence: spotlights[i % spotlights.length] });
    }
    if ((i + 1) % QUIZ_CARD_EVERY === 0 && spotlights.length > 0) {
      const quizSentence = spotlights[(i * 7 + 3) % spotlights.length];
      cards.push({ kind: "quiz", id: `c${nextCardId++}`, sentence: quizSentence });
    }
  });
  return cards;
}

export type LoadedFeed = { level: FeedLevel; sentences: FeedSentence[]; cards: FeedCard[] };

// Survives client-side navigation (e.g. opening a story and coming back),
// so the feed resumes on the same card instead of reshuffling.
let cachedFeed: (LoadedFeed & { index: number }) | null = null;

export function getCachedFeed() {
  return cachedFeed;
}

export function cacheFeed(feed: (LoadedFeed & { index: number }) | null) {
  cachedFeed = feed;
}
