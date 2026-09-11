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
