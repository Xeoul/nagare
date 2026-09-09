import kuromoji, { type IpadicFeatures, type Tokenizer } from "kuromoji";

export type Token = IpadicFeatures;

let tokenizerPromise: Promise<Tokenizer<IpadicFeatures>> | null = null;

/**
 * Lazily builds a singleton kuromoji tokenizer. The dictionary is fetched
 * from /dict (copied from node_modules — see scripts/copy-kuromoji-dict.mjs)
 * on first use and cached by the browser after that.
 *
 * This runs entirely client-side, which is why Phase 0 needs no backend at
 * all: docs/PLAN.md plans to swap this for a server-side Sudachi service
 * once accuracy or accounts/sync (Phase 4) call for one.
 */
export function getTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath: "/dict/" }).build((err, tokenizer) => {
        if (err) reject(err);
        else resolve(tokenizer);
      });
    });
  }
  return tokenizerPromise;
}

/** A token is worth clicking on if it carries actual language content. */
export function isLookupable(token: Token): boolean {
  return token.pos !== "記号" && token.surface_form.trim().length > 0;
}

/** The dictionary-form key to look a token up by: its lemma, or itself. */
export function lookupKey(token: Token): string {
  return token.basic_form && token.basic_form !== "*"
    ? token.basic_form
    : token.surface_form;
}
