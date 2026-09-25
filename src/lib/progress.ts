import { get, set } from "idb-keyval";
import type { Level } from "./content";

const KEY = "nagare:progress";

/** Where one word or grammar point sits in review. */
export type ItemState = {
  stage: number;
  due: number;
  right: number;
  wrong: number;
};

export type Progress = {
  /** Keyed "w:<word>" or "g:<grammar id>". */
  items: Record<string, ItemState>;
  /** Words saved from a tap or the save button, newest first. */
  saved: string[];
  /** How far into each lesson list the feed has introduced. */
  cursor: { word: number; grammar: number; fact: number; story: number; line: number };
  level: Level;
  furigana: boolean;
};

/**
 * Review gaps by stage. The first two are short on purpose — a new word
 * comes back as a quiz a few swipes later, then again later that session —
 * and from there each correct answer roughly doubles the wait. A miss drops
 * it back to the start.
 */
const INTERVALS = [
  60_000,
  5 * 60_000,
  24 * 3600_000,
  3 * 24 * 3600_000,
  7 * 24 * 3600_000,
  16 * 24 * 3600_000,
  35 * 24 * 3600_000,
  90 * 24 * 3600_000,
];

/** Stage an item reaches once it's reviewed at the 1-day gap — used for "learned" counts. */
export const LEARNED_STAGE = 3;
/** Where "I already know this" puts a word: its next check is a week out. */
const KNOWN_STAGE = 4;

export function emptyProgress(): Progress {
  return {
    items: {},
    saved: [],
    cursor: { word: 0, grammar: 0, fact: 0, story: 0, line: 0 },
    level: "N5",
    furigana: true,
  };
}

export async function loadProgress(): Promise<Progress> {
  try {
    const stored = await get<Progress>(KEY);
    return stored ? { ...emptyProgress(), ...stored } : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: Progress): void {
  void set(KEY, progress).catch((err) => console.error("Couldn't save progress", err));
}

/** Starts reviewing an item the first time its lesson card is shown. */
export function introduce(progress: Progress, id: string, now = Date.now()): Progress {
  if (progress.items[id]) return progress;
  return {
    ...progress,
    items: { ...progress.items, [id]: { stage: 0, due: now + INTERVALS[0], right: 0, wrong: 0 } },
  };
}

export function markKnown(progress: Progress, id: string, now = Date.now()): Progress {
  const current = progress.items[id] ?? { stage: 0, due: now, right: 0, wrong: 0 };
  return {
    ...progress,
    items: {
      ...progress.items,
      [id]: { ...current, stage: KNOWN_STAGE, due: now + INTERVALS[KNOWN_STAGE] },
    },
  };
}

export function recordAnswer(progress: Progress, id: string, correct: boolean, now = Date.now()): Progress {
  const current = progress.items[id] ?? { stage: 0, due: now, right: 0, wrong: 0 };
  const stage = correct ? Math.min(current.stage + 1, INTERVALS.length - 1) : 0;
  return {
    ...progress,
    items: {
      ...progress.items,
      [id]: {
        stage,
        due: now + INTERVALS[stage],
        right: current.right + (correct ? 1 : 0),
        wrong: current.wrong + (correct ? 0 : 1),
      },
    },
  };
}

export function toggleSaved(progress: Progress, key: string, now = Date.now()): Progress {
  const saved = progress.saved.includes(key)
    ? progress.saved.filter((k) => k !== key)
    : [key, ...progress.saved];
  // Saving a word also queues it for review, so it comes back as a quiz.
  const next = { ...progress, saved };
  return saved.includes(key) ? introduce(next, `w:${key}`, now) : next;
}

export function stats(progress: Progress, now = Date.now()) {
  const items = Object.values(progress.items);
  return {
    learning: items.filter((i) => i.stage < LEARNED_STAGE).length,
    learned: items.filter((i) => i.stage >= LEARNED_STAGE).length,
    due: items.filter((i) => i.due <= now).length,
  };
}
