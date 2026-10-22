import { assetUrl } from "@/lib/base-path";

// The study data behind the Study page and the quiz: words, kanji and grammar
// points for each JLPT level, with example sentences. Built from OpenJLPT by
// scripts/build-jlpt-study-data.mjs (see NOTICE.md); one file per level in
// public/jlpt/, fetched when first needed and kept in memory.

export type Level = "N5" | "N4" | "N3" | "N2" | "N1";
export const LEVELS: Level[] = ["N5", "N4", "N3", "N2", "N1"];

export type Example = {
  /** Plain Japanese sentence. */
  j: string;
  /** English translation. */
  en: string;
  /** Same sentence with readings, in {漢字|かんじ} notation, when available. */
  f?: string;
};

export type VocabItem = { w: string; r: string; m: string[]; p?: string; e: Example[] };
export type KanjiItem = { c: string; s: number; on: string[]; kun: string[]; m: string[]; w: string[] };
export type GrammarItem = {
  id: string;
  /** The pattern as written in the list, e.g. 〜わけだ. */
  p: string;
  /** Meaning in English. */
  m: string;
  /** How the pattern attaches. */
  f: string;
  t: string[];
  /** Usage notes. */
  n: string;
  e: Example[];
};

export type LevelData = { level: Level; vocab: VocabItem[]; kanji: KanjiItem[]; grammar: GrammarItem[] };

const cache = new Map<Level, Promise<LevelData | null>>();

/** Loads one level's data; resolves to null if the file can't be fetched. */
export function loadLevel(level: Level): Promise<LevelData | null> {
  let promise = cache.get(level);
  if (!promise) {
    promise = fetch(assetUrl(`/jlpt/${level.toLowerCase()}.json`))
      .then((res) => {
        if (!res.ok) throw new Error(`JLPT data fetch failed: ${res.status}`);
        return res.json() as Promise<LevelData>;
      })
      .catch(() => {
        cache.delete(level);
        return null;
      });
    cache.set(level, promise);
  }
  return promise;
}

export type RubyPart = { text: string; ruby?: string };

/** Splits "{三|さん}{年|ねん}も" into parts, with readings on the kanji. */
export function parseFurigana(source: string): RubyPart[] {
  const parts: RubyPart[] = [];
  const pattern = /\{([^|}]+)\|([^}]+)\}/g;
  let last = 0;
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    if (match.index > last) parts.push({ text: source.slice(last, match.index) });
    parts.push({ text: match[1], ruby: match[2] });
    last = pattern.lastIndex;
  }
  if (last < source.length) parts.push({ text: source.slice(last) });
  return parts;
}
