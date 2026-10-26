import { pipeline, env } from "@huggingface/transformers";
import { basePath } from "./base-path";

type Pipeline = (text: string, options: Record<string, unknown>) => Promise<unknown>;
let translatorPromise: Promise<Pipeline> | null = null;

type ProgressEvent = {
  status: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
};

// Forces the single-threaded WASM backend instead of the multi-threaded one.
// Multi-threading needs cross-origin isolation (COOP/COEP headers) to use
// SharedArrayBuffer, and testing it didn't show a reliable speed win here
// while adding real complexity — not worth it for this app's scale.
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;

// The model and the ONNX runtime's WASM both ship with the app (public/models
// and public/ort) instead of being fetched from Hugging Face and jsDelivr,
// so translation works offline and never waits on a ~110MB first download.
// The plain WASM build is used everywhere: with a single thread and no GPU
// it's all this app needs, and it runs on Safari as well as Chromium.
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = `${basePath}/models/`;
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = {
    mjs: `${basePath}/ort/ort-wasm-simd-threaded.mjs`,
    wasm: `${basePath}/ort/ort-wasm-simd-threaded.wasm`,
  };
}

function getTranslator(): Promise<Pipeline> {
  if (!translatorPromise) {
    translatorPromise = pipeline("translation", "Xenova/opus-mt-ja-en", {
      // graphOptimizationLevel must be lowered to work around a known
      // onnxruntime-web bug where its default optimizer rewrites this model's
      // quantized weights into a MatMulNBits op that expects a scale tensor
      // the export doesn't have, and fails to create a session.
      // https://github.com/huggingface/transformers.js/issues/1707
      session_options: { graphOptimizationLevel: "basic" },
      progress_callback: (progress: ProgressEvent) => {
        self.postMessage({ type: "progress", progress });
      },
    }) as unknown as Promise<Pipeline>;
  }
  return translatorPromise;
}

type IncomingMessage = { type: "warm" } | { type: "translate"; id: number; text: string };

self.addEventListener("message", async (event: MessageEvent<IncomingMessage>) => {
  // A "warm" message just triggers the model download/load with no
  // translation attached — used to preload before the user opens a
  // reading, so the worker (and progress events) still behave exactly
  // like a real request, but there's no id to reply to.
  if (event.data.type === "warm") {
    await getTranslator();
    self.postMessage({ type: "warmed" });
    return;
  }

  const { id, text } = event.data;
  try {
    const translator = await getTranslator();
    const output = await translator(text, {
      num_beams: 1,
      do_sample: false,
      max_new_tokens: 256,
      no_repeat_ngram_size: 3,
    });
    const [first] = Array.isArray(output) ? output : [output];
    const result = first as { translation_text?: string };
    self.postMessage({ type: "result", id, result: result.translation_text?.trim() ?? "" });
  } catch (err) {
    self.postMessage({ type: "result", id, error: err instanceof Error ? err.message : String(err) });
  }
});
