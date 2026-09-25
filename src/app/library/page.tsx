"use client";

import { useEffect, useState } from "react";
import ImportPanel from "@/components/ImportPanel";
import LibraryList from "@/components/LibraryList";
import ClassicsShelf from "@/components/ClassicsShelf";
import StarterShelf from "@/components/StarterShelf";
import WikibooksShelf from "@/components/WikibooksShelf";
import ContinueReading from "@/components/ContinueReading";
import BottomNav from "@/components/BottomNav";
import { onModelProgress, preloadTranslationModel, type ModelProgress } from "@/lib/translate";

export default function LibraryPage() {
  const [modelProgress, setModelProgress] = useState<ModelProgress>(null);

  // Also started by the feed; a no-op if it's already loading. Covers
  // landing here directly without passing through the feed first.
  useEffect(() => {
    preloadTranslationModel();
    return onModelProgress(setModelProgress);
  }, []);

  const downloadPercent =
    modelProgress && modelProgress.total > 0
      ? Math.min(100, Math.round((modelProgress.loaded / modelProgress.total) * 100))
      : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 p-4 pb-28 sm:p-8 sm:pb-28">
      <header className="border-b border-line/70 pb-6">
        <p className="font-display text-sm tracking-wide text-ink-soft">
          流れ — &quot;flow&quot;
        </p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Library</h1>
      </header>

      {downloadPercent !== null && (
        <p className="-mt-6 text-xs text-ink-soft">
          Downloading translation model (one-time, ~110MB)… {downloadPercent}%
        </p>
      )}

      <ContinueReading />

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">Import</h2>
        <ImportPanel />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
          Starter readings
        </h2>
        <StarterShelf />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
          Fairy Tales
        </h2>
        <WikibooksShelf />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
          Classics
        </h2>
        <ClassicsShelf />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
          Library
        </h2>
        <LibraryList />
      </section>

      <footer className="border-t border-line/70 pt-6 text-xs text-ink-soft">
        Dictionary data from{" "}
        <a
          href="https://www.edrdg.org/jmdict/j_jmdict.html"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-accent"
        >
          JMdict/EDRDG
        </a>
        , used in conformance with the Group&apos;s{" "}
        <a
          href="https://www.edrdg.org/edrdg/licence.html"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-accent"
        >
          licence
        </a>
        . Sentence translation uses{" "}
        <a
          href="https://huggingface.co/Xenova/opus-mt-ja-en"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-accent"
        >
          Xenova/opus-mt-ja-en
        </a>
        , run locally in your browser. Fairy tales from{" "}
        <a
          href="https://en.wikibooks.org/wiki/Japanese/Reader"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-accent"
        >
          Wikibooks
        </a>
        , licensed{" "}
        <a
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-accent"
        >
          CC BY-SA 4.0
        </a>
        .
      </footer>

      <BottomNav />
    </div>
  );
}
