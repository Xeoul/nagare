"use client";

import { useEffect, useState } from "react";
import ImportPanel from "@/components/ImportPanel";
import LibraryList from "@/components/LibraryList";
import ClassicsShelf from "@/components/ClassicsShelf";
import StarterShelf from "@/components/StarterShelf";
import WikibooksShelf from "@/components/WikibooksShelf";
import ContinueReading from "@/components/ContinueReading";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-9 pb-32 pt-4 sm:pt-8">
      <div className="px-5">
        <PageHeader title="Library" />
        {downloadPercent !== null && (
          <div className="mt-4 flex items-center gap-3 text-xs text-ink-soft">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-paper-sunk">
              <span className="block h-full rounded-full bg-accent transition-[width]" style={{ width: `${downloadPercent}%` }} />
            </span>
            <span className="shrink-0 tabular-nums">Translation model {downloadPercent}%</span>
          </div>
        )}
      </div>

      <ContinueReading />

      <StarterShelf />
      <WikibooksShelf />
      <ClassicsShelf />

      <section className="flex flex-col gap-3">
        <h2 className="px-5 text-xl font-bold tracking-tight">Your shelf</h2>
        <ImportPanel />
        <LibraryList />
      </section>

      <footer className="mx-5 border-t border-line pt-5 text-[11px] leading-relaxed text-ink-soft/80">
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
