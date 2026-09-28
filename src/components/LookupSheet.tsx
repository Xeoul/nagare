"use client";

import { useEffect, useState } from "react";
import type { JmdictEntry } from "@/lib/dictionary";
import { isStarred, toggleStarred } from "@/lib/starred";
import { BookmarkIcon, XIcon } from "./icons";

type Props = {
  surfaceForm: string;
  lookupKey: string;
  entry: JmdictEntry | null;
  onClose: () => void;
};

export default function LookupSheet({ surfaceForm, lookupKey, entry, onClose }: Props) {
  const [starred, setStarred] = useState(false);

  useEffect(() => {
    void isStarred(lookupKey).then(setStarred);
  }, [lookupKey]);

  const meanings = entry?.meanings.slice(0, 4) ?? [];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
      <div className="w-full max-w-lg rounded-[1.75rem] bg-paper-raised/95 px-5 pb-5 pt-2.5 text-ink shadow-[0_-4px_40px_-8px_rgb(var(--shadow-color)/0.45)] ring-1 ring-line backdrop-blur-2xl">
        <div className="mx-auto h-1 w-9 rounded-full bg-line" />
        <div className="mt-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {entry && entry.reading !== surfaceForm && (
              <p className="text-sm text-ink-soft">{entry.reading}</p>
            )}
            <p className="text-[2rem] font-bold leading-tight tracking-tight">{surfaceForm}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-sunk text-ink-soft transition-colors hover:text-ink"
            aria-label="Close"
          >
            <XIcon className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        {entry ? (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {entry.level && (
                <span className="rounded-full bg-paper-sunk px-2 py-0.5 text-[11px] font-bold text-ink">
                  {entry.level}
                </span>
              )}
              <span className="truncate rounded-full bg-paper-sunk px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                {entry.pos.split(",")[0]}
              </span>
              {lookupKey !== surfaceForm && (
                <span className="rounded-full bg-paper-sunk px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                  from {lookupKey}
                </span>
              )}
            </div>
            <ol className="mt-3 flex flex-col gap-1">
              {meanings.map((meaning, i) => (
                <li key={meaning} className="flex gap-2.5 text-[15px] leading-snug">
                  <span className="w-3 shrink-0 text-right text-xs font-semibold leading-[1.45rem] text-ink-soft/70">
                    {i + 1}
                  </span>
                  <span>{meaning}</span>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => {
                void toggleStarred({
                  key: lookupKey,
                  reading: entry.reading,
                  meanings: entry.meanings,
                }).then((next) => setStarred(next.some((word) => word.key === lookupKey)));
              }}
              className={`mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold transition-all active:scale-[0.98] ${
                starred ? "bg-paper-sunk text-ink-soft" : "bg-ink text-paper"
              }`}
            >
              <BookmarkIcon className="h-[18px] w-[18px]" fill={starred ? "currentColor" : "none"} />
              {starred ? "Saved to your words" : "Save word"}
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">Not in the dictionary.</p>
        )}
      </div>
    </div>
  );
}
