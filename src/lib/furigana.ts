import type { Token } from "./tokenizer";

const KANJI = /[一-鿿㐀-䶿]/;

export function hasKanji(text: string): boolean {
  return KANJI.test(text);
}

/** Kuromoji readings are always katakana; furigana is conventionally hiragana. */
export function katakanaToHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}

export type FuriganaParts = {
  before: string;
  kanji: string;
  reading: string;
  after: string;
};

/**
 * Splits a token into a (leading kana) + (kanji core) + (trailing okurigana)
 * so furigana renders only over the kanji itself — e.g. 食べる/たべる
 * becomes {before: "", kanji: "食", reading: "た", after: "べる"} instead of
 * putting the whole reading over the whole word.
 */
function splitOkurigana(surface: string, reading: string): FuriganaParts {
  let end = surface.length;
  let readEnd = reading.length;
  while (
    end > 0 &&
    readEnd > 0 &&
    surface[end - 1] === reading[readEnd - 1] &&
    !hasKanji(surface[end - 1])
  ) {
    end--;
    readEnd--;
  }

  let start = 0;
  let readStart = 0;
  while (
    start < end &&
    readStart < readEnd &&
    surface[start] === reading[readStart] &&
    !hasKanji(surface[start])
  ) {
    start++;
    readStart++;
  }

  return {
    before: surface.slice(0, start),
    kanji: surface.slice(start, end),
    reading: reading.slice(readStart, readEnd),
    after: surface.slice(end),
  };
}

/**
 * Returns the furigana breakdown for a token, or null if it doesn't need
 * any (no kanji, no reading, or the reading doesn't actually tell us
 * anything the kanji itself doesn't already show).
 */
export function getFurigana(token: Token): FuriganaParts | null {
  if (!hasKanji(token.surface_form) || !token.reading || token.reading === "*") {
    return null;
  }
  const parts = splitOkurigana(token.surface_form, katakanaToHiragana(token.reading));
  if (!parts.kanji || !parts.reading || parts.kanji === parts.reading) {
    return null;
  }
  return parts;
}
