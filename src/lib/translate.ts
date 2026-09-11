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
    pipelinePromise = import("@huggingface/transformers").then(async ({ pipeline, env }) => {
      // Forces the single-threaded WASM backend instead of the multi-threaded
      // one, which occasionally crashed the tab under load — worth trading
      // some inference speed for reliability here.
      if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;
      // graphOptimizationLevel must be lowered to work around a known
      // onnxruntime-web bug where its default optimizer rewrites this
      // model's quantized weights into a MatMulNBits op that expects a scale
      // tensor the export doesn't have, and fails to create a session.
      // https://github.com/huggingface/transformers.js/issues/1707
      const translator = await pipeline("translation", "Xenova/opus-mt-ja-en", {
        session_options: { graphOptimizationLevel: "basic" },
      });
      return async (text: string) => {
        const output = await translator(text, {
          num_beams: 1,
          do_sample: false,
          max_new_tokens: 256,
          no_repeat_ngram_size: 3,
        });
        const [first] = Array.isArray(output) ? output : [output];
        const result = first as { translation_text?: string };
        return result.translation_text?.trim() ?? "";
      };
    });
  }
  return pipelinePromise;
}

const cache = new Map<string, Promise<string>>();

// Sentences become visible in a burst while scrolling, but the model only
// has one inference session — running requests one at a time (instead of
// letting them all fire at once) keeps memory/CPU use predictable, which
// matters on phones and avoids overloading the WASM runtime.
let queue: Promise<unknown> = Promise.resolve();

/** Translates one sentence, caching by exact text so re-renders and re-visits are free. */
export function translateSentence(text: string): Promise<string> {
  const cached = cache.get(text);
  if (cached) return cached;

  const promise = queue.then(() => getTranslator()).then((translate) => translate(text));
  queue = promise.catch(() => {});
  cache.set(text, promise);
  promise.catch(() => cache.delete(text));
  return promise;
}
