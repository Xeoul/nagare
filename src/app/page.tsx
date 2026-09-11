"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ImportPanel from "@/components/ImportPanel";
import LibraryList from "@/components/LibraryList";
import ClassicsShelf from "@/components/ClassicsShelf";
import StarterShelf from "@/components/StarterShelf";
import { getStarred } from "@/lib/starred";

export default function LibraryPage() {
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    void getStarred().then((words) => setWordCount(words.length));
  }, []);

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
        .
      </footer>
    </div>
  );
}
