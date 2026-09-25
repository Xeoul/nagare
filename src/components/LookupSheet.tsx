"use client";

import { useEffect, useState } from "react";
import type { JmdictEntry } from "@/lib/dictionary";
import { isStarred, toggleStarred } from "@/lib/starred";

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

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-line/70 bg-paper px-4 text-ink py-3.5 shadow-[0_-8px_24px_-8px_rgb(var(--shadow-color)/0.3)]">
      <div className="mx-auto flex max-w-2xl items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="font-display text-lg leading-tight">{surfaceForm}</p>
            {entry && <p className="text-xs text-ink-soft">{entry.reading}</p>}
          </div>

          {entry ? (
            <>
              <p className="mt-0.5 truncate text-sm">{entry.meanings.join("; ")}</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-xs text-ink-soft">
                  {entry.pos}
                  {entry.level ? ` · ${entry.level}` : ""}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    void toggleStarred({
                      key: lookupKey,
                      reading: entry.reading,
                      meanings: entry.meanings,
                    }).then((next) => setStarred(next.some((word) => word.key === lookupKey)));
                  }}
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all active:scale-95 ${
                    starred
                      ? "border-accent bg-accent text-paper shadow-sm"
                      : "border-line text-ink-soft hover:border-accent hover:text-accent hover:shadow-sm"
                  }`}
                >
                  {starred ? "Added ✓" : "Add to word list"}
                </button>
              </div>
            </>
          ) : (
            <p className="mt-0.5 text-xs text-ink-soft">Not in the dictionary</p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-sm text-ink-soft hover:text-ink"
          aria-label="Close"
        >
          Close
        </button>
      </div>
    </div>
  );
}
