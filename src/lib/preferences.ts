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
