type Pipeline = {
  (text: string, options: Record<string, unknown>): Promise<unknown>;
  dispose: () => Promise<void>;
};

let pipelinePromise: Promise<Pipeline> | null = null;
let callsOnCurrentSession = 0;

// The underlying WASM runtime is a dev build and has, in testing, gotten
// stuck on an inference call after enough sequential requests on the same
// session. Recycling the session periodically keeps that from compounding
// over a long reading session — recreating it is cheap since the model
// bytes are already cached by the browser.
const MAX_CALLS_PER_SESSION = 5;

async function createPipeline(): Promise<Pipeline> {
  const { pipeline, env } = await import("@huggingface/transformers");
  // Forces the single-threaded WASM backend instead of the multi-threaded
  // one, which occasionally crashed the tab under load — worth trading
  // some inference speed for reliability here.
  if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;
  // graphOptimizationLevel must be lowered to work around a known
  // onnxruntime-web bug where its default optimizer rewrites this model's
  // quantized weights into a MatMulNBits op that expects a scale tensor
  // the export doesn't have, and fails to create a session.
  // https://github.com/huggingface/transformers.js/issues/1707
  const translator = await pipeline("translation", "Xenova/opus-mt-ja-en", {
    session_options: { graphOptimizationLevel: "basic" },
  });
  return translator as unknown as Pipeline;
}

/**
 * Lazily loads an offline Japanese→English translation model
 * (Xenova/opus-mt-ja-en, ~110MB quantized) via transformers.js. Runs
 * entirely client-side — nothing is sent to a server — and the model is
 * cached by the browser after the first download, so translation keeps
 * working offline from then on.
 */
function getTranslator(): Promise<Pipeline> {
  if (!pipelinePromise) pipelinePromise = createPipeline();
  return pipelinePromise;
}

async function recycleSession() {
  const current = pipelinePromise;
  pipelinePromise = null;
  callsOnCurrentSession = 0;
  try {
    (await current)?.dispose();
  } catch {
    // Best-effort cleanup — a fresh session gets created on the next call regardless.
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Translation timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function runTranslation(text: string): Promise<string> {
  const translator = await getTranslator();
  callsOnCurrentSession += 1;

  try {
    // A hard cap in case a call hangs despite the mitigations above — without
    // it, one stuck request would permanently block every sentence queued
    // behind it.
    const output = await withTimeout(
      translator(text, {
        num_beams: 1,
        do_sample: false,
        max_new_tokens: 256,
        no_repeat_ngram_size: 3,
      }),
      20000,
    );
    const [first] = Array.isArray(output) ? output : [output];
    const result = first as { translation_text?: string };
    return result.translation_text?.trim() ?? "";
  } finally {
    if (callsOnCurrentSession >= MAX_CALLS_PER_SESSION) {
      void recycleSession();
    }
  }
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

  const promise = queue.then(() => runTranslation(text));
  queue = promise.catch(() => {});
  cache.set(text, promise);
  promise.catch(() => cache.delete(text));
  return promise;
}
