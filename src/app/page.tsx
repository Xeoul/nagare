"use client";

import { useEffect } from "react";
import ImportPanel from "@/components/ImportPanel";
import LibraryList from "@/components/LibraryList";
import ClassicsShelf from "@/components/ClassicsShelf";
import AozoraSearch from "@/components/AozoraSearch";
import StarterShelf from "@/components/StarterShelf";
import WikibooksShelf from "@/components/WikibooksShelf";
import ContinueReading from "@/components/ContinueReading";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { preloadTranslationModel } from "@/lib/translate";

// The commit this build was made from (set by the Pages workflow), shown at the
// bottom of the page so it's easy to tell which version an installed copy is on.
const BUILD_ID = (process.env.NEXT_PUBLIC_BUILD_ID ?? "local").slice(0, 7);

export default function LibraryPage() {
  // Start loading the translation model in the background while you pick
  // something to read, so it's ready (or nearly) by the time the reader asks
  // for it. It loads quietly, with no progress bar on this page.
  useEffect(() => {
    preloadTranslationModel();
  }, []);

  return (
    <div className="flex flex-1 flex-col lg:pl-60">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-9 pb-32 pt-4 sm:pt-8 lg:max-w-6xl lg:px-6 lg:pb-16 lg:pt-12">
        <div className="px-5">
          <PageHeader title="Library" />
        </div>

        <ContinueReading />

        <StarterShelf range="beginner" />
        <WikibooksShelf />
        <StarterShelf range="advanced" />
        <ClassicsShelf />
        <ClassicsShelf novels />
        <AozoraSearch />

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
          <span className="mt-3 block tabular-nums text-ink-soft/60">Build {BUILD_ID}</span>
        </footer>

        <BottomNav />
      </div>
    </div>
  );
}
