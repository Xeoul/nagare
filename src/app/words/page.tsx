"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStarred, type StarredWord } from "@/lib/starred";

export default function WordsPage() {
  const [words, setWords] = useState<StarredWord[] | null>(null);

  useEffect(() => {
    void getStarred().then(setWords);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <div className="flex items-center justify-between gap-4 border-b border-line/70 pb-6">
        <Link href="/" className="text-sm text-ink-soft transition-colors hover:text-accent">
          ← Library
        </Link>
        <h1 className="text-sm font-medium text-ink-soft">Word list</h1>
      </div>

      {words === null ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : words.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Nothing added yet — tap a word while reading and add it here.
        </p>
      ) : (
        <>
          <p className="text-xs text-ink-soft">
            {words.length} word{words.length === 1 ? "" : "s"}. This is just a list for now —
            spaced-repetition review lands with the Phase 1 study hub.
          </p>
          <ul className="flex flex-col gap-2">
            {words.map((word) => (
              <li key={word.key} className="card px-4 py-3">
                <p className="font-display text-lg">{word.key}</p>
                <p className="text-sm text-ink-soft">
                  {word.reading} · {word.meanings.join("; ")}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
