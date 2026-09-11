let pipelinePromise: Promise<(text: string) => Promise<string>> | null = null;

/**
 * Lazily loads an offline Japanese→English translation model
 * (Xenova/opus-mt-ja-en, ~110MB quantized) via transformers.js. Runs
 * entirely client-side — nothing is sent to a server — and the model is
 * cached by the browser after the first download, so translation keeps
 * working offline from then on.
 */
function getTranslator(): Promise<(text: string) => Promise<string>> {
  if (!pipelinePromise) {
    pipelinePromise = import("@huggingface/transformers").then(async ({ pipeline }) => {
      const translator = await pipeline("translation", "Xenova/opus-mt-ja-en");
      return async (text: string) => {
        const output = await translator(text, { num_beams: 1, do_sample: false });
        const [first] = Array.isArray(output) ? output : [output];
        const result = first as { translation_text?: string };
        return result.translation_text?.trim() ?? "";
      };
    });
  }
  return pipelinePromise;
}

const cache = new Map<string, Promise<string>>();

/** Translates one sentence, caching by exact text so re-renders and re-visits are free. */
export function translateSentence(text: string): Promise<string> {
  const cached = cache.get(text);
  if (cached) return cached;

  const promise = getTranslator().then((translate) => translate(text));
  cache.set(text, promise);
  promise.catch(() => cache.delete(text));
  return promise;
}
