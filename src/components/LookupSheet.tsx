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
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper px-5 py-5 shadow-[0_-4px_16px_rgba(0,0,0,0.12)]">
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-2xl">{surfaceForm}</p>
            {entry && <p className="text-sm text-ink-soft">{entry.reading}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-ink-soft hover:text-ink"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        {entry ? (
          <>
            <p className="text-sm">{entry.meanings.join("; ")}</p>
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
              className={`self-start rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                starred
                  ? "border-accent bg-accent text-paper"
                  : "border-line text-ink-soft hover:border-accent hover:text-accent"
              }`}
            >
              {starred ? "Added to word list ✓" : "Add to word list"}
            </button>
          </>
        ) : (
          <p className="text-sm text-ink-soft">
            Not in the dictionary — it covers ~22,000 common words, not the full JMdict.
          </p>
        )}
      </div>
    </div>
  );
}
