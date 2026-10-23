import { useSyncExternalStore } from "react";

// What you've studied and how the quiz answers have gone, kept on this device.
// Keys name an item: v:<word>, k:<kanji>, g:<grammar id>, p:<reading title>.

const KEY = "nagare:progress";

export type Rec = {
  /** Answers given. */
  a: number;
  /** Correct answers. */
  c: number;
  /** Current run of correct answers. */
  s: number;
  /** Marked as learned on the Study page. */
  l?: boolean;
  /** Last touched. */
  t: number;
};
export type Progress = Record<string, Rec>;
export type Status = "new" | "learning" | "weak" | "mastered";

const EMPTY: Progress = {};
let raw: string | null | undefined;
let parsed: Progress = EMPTY;
const listeners = new Set<() => void>();

function readStore(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function getProgress(): Progress {
  if (typeof window === "undefined") return EMPTY;
  const now = readStore();
  if (now !== raw) {
    raw = now;
    try {
      parsed = now ? (JSON.parse(now) as Progress) : EMPTY;
    } catch {
      parsed = EMPTY;
    }
  }
  return parsed;
}

function mutate(change: (draft: Progress) => void) {
  const draft: Progress = { ...getProgress() };
  change(draft);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Without storage the progress just isn't kept.
  }
  listeners.forEach((fn) => fn());
}

export function recordAnswers(list: { key: string; correct: boolean }[]) {
  const keyed = list.filter((x) => x.key);
  if (!keyed.length) return;
  mutate((draft) => {
    for (const { key, correct } of keyed) {
      const old = draft[key] ?? { a: 0, c: 0, s: 0, t: 0 };
      draft[key] = { ...old, a: old.a + 1, c: old.c + (correct ? 1 : 0), s: correct ? old.s + 1 : 0, t: Date.now() };
    }
  });
}

export function toggleLearned(key: string) {
  mutate((draft) => {
    const old = draft[key] ?? { a: 0, c: 0, s: 0, t: 0 };
    draft[key] = { ...old, l: !old.l, t: Date.now() };
  });
}

export function resetProgress() {
  mutate((draft) => {
    for (const k of Object.keys(draft)) delete draft[k];
  });
}

export function statusOf(rec: Rec | undefined): Status {
  if (!rec) return "new";
  if (rec.a > 0) return rec.s >= 2 ? "mastered" : rec.s === 0 ? "weak" : "learning";
  return rec.l ? "learning" : "new";
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress, () => EMPTY);
}

export function setLearned(key: string, learned: boolean) {
  mutate((draft) => {
    const old = draft[key] ?? { a: 0, c: 0, s: 0, t: 0 };
    draft[key] = { ...old, l: learned, t: Date.now() };
  });
}
