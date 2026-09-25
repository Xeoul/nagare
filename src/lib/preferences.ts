const FURIGANA_KEY = "nagare:show-furigana";

/** Defaults to on — most useful for the N5-to-N1 audience this reader is for. */
export function getFuriganaPreference(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(FURIGANA_KEY);
  return stored === null ? true : stored === "1";
}

export function setFuriganaPreference(show: boolean): void {
  window.localStorage.setItem(FURIGANA_KEY, show ? "1" : "0");
}

const TRANSLATION_KEY = "nagare:show-translation";

/** Defaults to off — translation downloads an offline MT model on first use. */
export function getTranslationPreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(TRANSLATION_KEY) === "1";
}

export function setTranslationPreference(show: boolean): void {
  window.localStorage.setItem(TRANSLATION_KEY, show ? "1" : "0");
}

const VERTICAL_KEY = "nagare:vertical-text";

/** Defaults to off — horizontal is the more familiar starting layout. */
export function getVerticalPreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(VERTICAL_KEY) === "1";
}

export function setVerticalPreference(vertical: boolean): void {
  window.localStorage.setItem(VERTICAL_KEY, vertical ? "1" : "0");
}

const CONTINUE_DISMISSED_KEY = "nagare:continue-reading-dismissed";

/**
 * Remembers which item's "Continue reading" card was dismissed, keyed to
 * that item's lastOpenedAt so the card comes back if you open the book
 * again later (a fresh open makes the old dismissal stale).
 */
export function getDismissedContinueReading(): { id: string; lastOpenedAt: number } | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CONTINUE_DISMISSED_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setDismissedContinueReading(id: string, lastOpenedAt: number): void {
  window.localStorage.setItem(CONTINUE_DISMISSED_KEY, JSON.stringify({ id, lastOpenedAt }));
}

const FEED_LEVEL_KEY = "nagare:feed-level";

/** Defaults to N5 — the feed should open on something a beginner can read. */
export function getFeedLevelPreference(): "N5" | "N4" | "N3+" {
  if (typeof window === "undefined") return "N5";
  const stored = window.localStorage.getItem(FEED_LEVEL_KEY);
  return stored === "N4" || stored === "N3+" ? stored : "N5";
}

const feedLevelListeners = new Set<() => void>();

/** For useSyncExternalStore, so the feed re-renders when the level changes. */
export function subscribeFeedLevel(listener: () => void): () => void {
  feedLevelListeners.add(listener);
  return () => feedLevelListeners.delete(listener);
}

export function setFeedLevelPreference(level: "N5" | "N4" | "N3+"): void {
  window.localStorage.setItem(FEED_LEVEL_KEY, level);
  for (const listener of feedLevelListeners) listener();
}
