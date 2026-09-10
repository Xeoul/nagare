"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ImportPanel from "@/components/ImportPanel";
import LibraryList from "@/components/LibraryList";
import ClassicsShelf from "@/components/ClassicsShelf";
import { addItem, listItems } from "@/lib/library";
import { getStarred } from "@/lib/starred";
import { SAMPLE_TEXT, SAMPLE_TITLE } from "@/lib/sample";

export default function LibraryPage() {
  const router = useRouter();
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    void getStarred().then((words) => setWordCount(words.length));
  }, []);

  async function openSample() {
    const existing = (await listItems()).find((item) => item.kind === "sample");
    const item = existing ?? (await addItem({ title: SAMPLE_TITLE, text: SAMPLE_TEXT, kind: "sample" }));
    router.push(`/read/${item.id}`);
  }

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
        <button
          type="button"
          onClick={() => void openSample()}
          className="self-start text-sm text-accent hover:underline"
        >
          Or try a sample N5 text →
        </button>
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
