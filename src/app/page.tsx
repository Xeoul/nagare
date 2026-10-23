"use client";

import Link from "next/link";
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
import { BookmarkIcon } from "@/components/icons";
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
          <PageHeader title="Library">
            <Link
              href="/words"
              className="flex h-9 items-center gap-1.5 rounded-full bg-paper-raised px-3.5 text-sm font-semibold text-ink-soft ring-1 ring-line transition-colors hover:text-ink"
            >
              <BookmarkIcon className="h-4 w-4" />
              Saved
            </Link>
          </PageHeader>
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
          Dictionary data from JMdict/EDRDG (CC BY-SA 4.0, used in conformance with the EDRDG licence at
          edrdg.org/edrdg/licence.html). JLPT word, kanji and grammar lists from OpenJLPT (CC BY-SA 4.0), built on Jonathan
          Waller&apos;s JLPT lists, KANJIDIC2 and Tatoeba example sentences (CC BY 2.0 FR). Sentence translation uses
          Xenova/opus-mt-ja-en, run locally in your browser. Fairy tales from Wikibooks&apos; Japanese/Reader, licensed CC BY-SA 4.0
          (creativecommons.org/licenses/by-sa/4.0). Classics from Aozora Bunko.
          <span className="mt-3 block tabular-nums text-ink-soft/60">Build {BUILD_ID}</span>
        </footer>

        <BottomNav />
      </div>
    </div>
  );
}
