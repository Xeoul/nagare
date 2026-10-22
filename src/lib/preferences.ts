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

const GRAMMAR_KEY = "nagare:show-grammar";

/** Defaults to on — grammar hints are underlined sparingly, and tapping one explains it. */
export function getGrammarPreference(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(GRAMMAR_KEY);
  return stored === null ? true : stored === "1";
}

export function setGrammarPreference(show: boolean): void {
  window.localStorage.setItem(GRAMMAR_KEY, show ? "1" : "0");
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

export type ReaderTheme = "auto" | "light" | "sepia" | "dark";
export type ReaderPrefs = {
  /** Turn pages like an e-reader, or scroll continuously. */
  paged: boolean;
  /** Step into FONT_SCALES. */
  fontStep: number;
  spacing: "compact" | "normal" | "relaxed";
  theme: ReaderTheme;
};

export const FONT_SCALES = [0.8, 0.9, 1, 1.15, 1.3, 1.5];
export const SPACING_FACTORS: Record<ReaderPrefs["spacing"], number> = {
  compact: 0.85,
  normal: 1,
  relaxed: 1.18,
};

const READER_PREFS_KEY = "nagare:reader-prefs";
const DEFAULT_READER_PREFS: ReaderPrefs = { paged: true, fontStep: 2, spacing: "normal", theme: "auto" };

export function getReaderPrefs(): ReaderPrefs {
  if (typeof window === "undefined") return DEFAULT_READER_PREFS;
  try {
    const stored = JSON.parse(window.localStorage.getItem(READER_PREFS_KEY) ?? "{}") as Partial<ReaderPrefs>;
    return { ...DEFAULT_READER_PREFS, ...stored };
  } catch {
    return DEFAULT_READER_PREFS;
  }
}

export function setReaderPrefs(prefs: ReaderPrefs): void {
  window.localStorage.setItem(READER_PREFS_KEY, JSON.stringify(prefs));
}

const TOOLBAR_PINNED_KEY = "nagare:toolbar-pinned";

/** Whether the reader's toolbar stays on screen. Defaults to on for wide
 *  screens, where it costs nothing; on a phone it defaults to tuck-away. */
export function getToolbarPinnedPreference(): boolean {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(TOOLBAR_PINNED_KEY);
  if (stored !== null) return stored === "1";
  return window.matchMedia("(min-width: 1024px)").matches;
}

export function setToolbarPinnedPreference(pinned: boolean): void {
  window.localStorage.setItem(TOOLBAR_PINNED_KEY, pinned ? "1" : "0");
}

const TOOLBAR_HINT_KEY = "nagare:toolbar-hint-seen";

export function getToolbarHintSeen(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(TOOLBAR_HINT_KEY) === "1";
}

export function setToolbarHintSeen(): void {
  window.localStorage.setItem(TOOLBAR_HINT_KEY, "1");
}
