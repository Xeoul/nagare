// Translation runs in a Web Worker rather than the main thread. Testing
// showed the WASM inference call can occasionally block for a very long
// time — a same-thread timeout can't preempt that (its own timer needs the
// event loop free to fire, same as the thing hanging), but a worker can be
// terminated from outside regardless of what it's doing.
const TIMEOUT_MS = 20000;

type PendingRequest = {
  resolve: (value: string) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, PendingRequest>();

function failAllPending(err: Error) {
  for (const req of pending.values()) {
    clearTimeout(req.timer);
    req.reject(err);
  }
  pending.clear();
}

function terminateWorker() {
  worker?.terminate();
  worker = null;
}

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL("./translate-worker.ts", import.meta.url), { type: "module" });
  worker.addEventListener(
    "message",
    (event: MessageEvent<{ id: number; result?: string; error?: string }>) => {
      const { id, result, error } = event.data;
      const req = pending.get(id);
      if (!req) return;
      pending.delete(id);
      clearTimeout(req.timer);
      if (error) req.reject(new Error(error));
      else req.resolve(result ?? "");
    },
  );
  worker.addEventListener("error", (event) => {
    failAllPending(new Error(event.message || "Translation worker error"));
    terminateWorker();
  });
  return worker;
}

const cache = new Map<string, Promise<string>>();

/**
 * Translates one sentence to English using an offline model
 * (Xenova/opus-mt-ja-en) that runs entirely client-side in a Web Worker —
 * nothing is sent to a server, and the ~110MB model is cached by the
 * browser after the first download. Caches by exact text so re-renders and
 * re-visits are free, and results are memoized only on success.
 */
export function translateSentence(text: string): Promise<string> {
  const cached = cache.get(text);
  if (cached) return cached;

  const promise = new Promise<string>((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      // The worker is stuck — kill it outright so the next request starts fresh.
      terminateWorker();
      reject(new Error(`Translation timed out after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    getWorker().postMessage({ id, text });
  });
  cache.set(text, promise);
  promise.catch(() => cache.delete(text));
  return promise;
}
