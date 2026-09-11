import { pipeline, env } from "@huggingface/transformers";

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

self.addEventListener("message", async (event: MessageEvent<{ id: number; text: string }>) => {
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
