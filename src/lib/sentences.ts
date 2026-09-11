import type { Token } from "./tokenizer";

const SENTENCE_END = /^[。！？…‥]+$/;

/**
 * Groups a flat token stream into sentences, splitting right after a
 * sentence-ending punctuation token. Whitespace-only tokens (line breaks
 * between paragraphs) end up alone in their own "sentence" so callers can
 * skip translating them.
 */
export function splitIntoSentences(tokens: Token[]): Token[][] {
  const sentences: Token[][] = [];
  let current: Token[] = [];

  for (const token of tokens) {
    current.push(token);
    if (SENTENCE_END.test(token.surface_form)) {
      sentences.push(current);
      current = [];
    }
  }
  if (current.length > 0) sentences.push(current);

  return sentences;
}

/** Whether a sentence (as grouped by splitIntoSentences) has anything worth translating. */
export function isTranslatable(sentence: Token[]): boolean {
  return sentence.some((token) => token.pos !== "記号" && token.surface_form.trim().length > 0);
}

/** Plain text for translation: whitespace normalized since line breaks between paragraphs can end up inside a group. */
export function sentenceText(sentence: Token[]): string {
  return sentence
    .map((token) => token.surface_form)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
