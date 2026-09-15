"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ImportPanel from "@/components/ImportPanel";
import LibraryList from "@/components/LibraryList";
import ClassicsShelf from "@/components/ClassicsShelf";
import StarterShelf from "@/components/StarterShelf";
import WikibooksShelf from "@/components/WikibooksShelf";
import ContinueReading from "@/components/ContinueReading";
import { getStarred } from "@/lib/starred";
import { onModelProgress, preloadTranslationModel, type ModelProgress } from "@/lib/translate";

export default function LibraryPage() {
  const [wordCount, setWordCount] = useState(0);
  const [modelProgress, setModelProgress] = useState<ModelProgress>(null);

  useEffect(() => {
    void getStarred().then((words) => setWordCount(words.length));
  }, []);

  // Downloads the translation model as soon as the library page loads,
  // rather than waiting until a reading is open and Translation is toggled
  // on — so it's already there by the time you need it.
  useEffect(() => {
    preloadTranslationModel();
    return onModelProgress(setModelProgress);
  }, []);

  const downloadPercent =
    modelProgress && modelProgress.total > 0
      ? Math.min(100, Math.round((modelProgress.loaded / modelProgress.total) * 100))
      : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-4 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-sm text-ink-soft">流れ — &quot;flow&quot;</p>
          <h1 className="font-display text-3xl font-bold">Nagare</h1>
        </div>
        <Link href="/words" className="mt-1 text-sm text-ink-soft hover:text-accent">
          Word list ({wordCount})
        </Link>
      </header>

      {downloadPercent !== null && (
        <p className="text-xs text-ink-soft">
          Downloading translation model (one-time, ~110MB)… {downloadPercent}%
        </p>
      )}

      <ContinueReading />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-soft">Import</h2>
        <ImportPanel />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-soft">
          Starter readings
        </h2>
        <StarterShelf />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-soft">
          Fairy Tales
        </h2>
        <WikibooksShelf />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-soft">Classics</h2>
        <ClassicsShelf />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-soft">Library</h2>
        <LibraryList />
      </section>

      <footer className="text-xs text-ink-soft">
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
    </div>
  );
}
