import { get, set } from "idb-keyval";
import { getStarred, type StarredWord } from "./starred";

// Spaced repetition for saved words: a small SM-2-style scheduler. Each
// word's schedule lives here, keyed by the word, separate from the saved
// list itself (src/lib/starred.ts) — unsaving a word just leaves a harmless
// orphan entry behind.

const KEY = "nagare:review";
const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

export type Grade = "again" | "hard" | "good" | "easy";

type Schedule = {
  /** When the word is next due, in ms since the epoch. */
  due: number;
  /** Current gap between reviews, in days (0 while still being learned). */
  interval: number;
  ease: number;
  /** Successful reviews in a row. */
  reps: number;
};

const FRESH: Schedule = { due: 0, interval: 0, ease: 2.5, reps: 0 };

async function getSchedules(): Promise<Record<string, Schedule>> {
  return (await get<Record<string, Schedule>>(KEY)) ?? {};
}

function next(schedule: Schedule, grade: Grade, now: number): Schedule {
  const { ease, interval, reps } = schedule;
  switch (grade) {
    case "again":
      return { due: now + MINUTE, interval: 0, ease: Math.max(1.3, ease - 0.2), reps: 0 };
    case "hard": {
      const days = Math.max(1, Math.round(interval * 1.2));
      return { due: now + days * DAY, interval: days, ease: Math.max(1.3, ease - 0.15), reps: reps + 1 };
    }
    case "good": {
      const days = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(interval * ease);
      return { due: now + days * DAY, interval: days, ease, reps: reps + 1 };
    }
    case "easy": {
      const days = reps === 0 ? 4 : Math.round(interval * ease * 1.3);
      return { due: now + days * DAY, interval: days, ease: ease + 0.15, reps: reps + 1 };
    }
  }
}

/** How long each grade would push the word out, for the button labels. */
export function previewIntervals(schedule: Schedule | undefined): Record<Grade, string> {
  const now = Date.now();
  const base = schedule ?? FRESH;
  const label = (grade: Grade) => {
    const ms = next(base, grade, now).due - now;
    if (ms < DAY) return "<10m";
    const days = Math.round(ms / DAY);
    if (days < 30) return `${days}d`;
    if (days < 365) return `${Math.round(days / 30)}mo`;
    return `${Math.round(days / 365)}y`;
  };
  return { again: label("again"), hard: label("hard"), good: label("good"), easy: label("easy") };
}

export type ReviewItem = StarredWord & { schedule?: Schedule };

/** Saved words that are due now — new ones first, then the most overdue. */
export async function getDueWords(): Promise<ReviewItem[]> {
  const [words, schedules] = await Promise.all([getStarred(), getSchedules()]);
  const now = Date.now();
  return words
    .map((word) => ({ ...word, schedule: schedules[word.key] }))
    .filter((word) => !word.schedule || word.schedule.due <= now)
    .sort((a, b) => (a.schedule?.due ?? 0) - (b.schedule?.due ?? 0));
}

export async function countDue(): Promise<number> {
  return (await getDueWords()).length;
}

export async function gradeWord(key: string, grade: Grade): Promise<void> {
  const schedules = await getSchedules();
  schedules[key] = next(schedules[key] ?? FRESH, grade, Date.now());
  await set(KEY, schedules);
}
