"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listItems, type LibraryItem } from "@/lib/library";
import { coverGlyph, coverStyle } from "@/lib/cover";
import { PlayIcon, XIcon } from "./icons";
import { getDismissedContinueReading, setDismissedContinueReading } from "@/lib/preferences";

/** Not "finished" enough to still offer resuming — matches how close to the end counts as done. */
const UNFINISHED_CEILING = 0.98;

export default function ContinueReading() {
  const [item, setItem] = useState<LibraryItem | null>(null);

  useEffect(() => {
    void listItems().then((items) => {
      const dismissed = getDismissedContinueReading();
      const candidate = items
        .filter((i) => i.lastOpenedAt && i.progress > 0 && i.progress < UNFINISHED_CEILING)
        .sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))[0];
      if (!candidate) return;
      if (dismissed?.id === candidate.id && dismissed.lastOpenedAt === candidate.lastOpenedAt) return;
      setItem(candidate);
    });
  }, []);

  if (!item) return null;
  const percent = Math.round(item.progress * 100);

  return (
    <section className="px-5">
      <div className="relative overflow-hidden card rounded-[1.5rem] p-4">
        <Link href={`/read/${item.id}`} className="flex items-center gap-4">
          <span
            style={coverStyle(item.title)}
            className="relative flex h-20 w-[3.75rem] shrink-0 items-end justify-end overflow-hidden rounded-xl"
          >
            <span className="-mb-2 -mr-1 text-5xl font-bold leading-none text-white/[0.1]">
              {coverGlyph(item.title)}
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
              Continue reading
            </span>
            <span className="mt-1 block truncate text-lg font-bold">{item.title}</span>
            <span className="mt-2 flex items-center gap-2.5">
              <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-paper-sunk">
                <span className="block h-full rounded-full bg-ink/60" style={{ width: `${percent}%` }} />
              </span>
              <span className="text-xs tabular-nums text-ink-soft">{percent}%</span>
            </span>
          </span>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper-sunk text-ink">
            <PlayIcon className="ml-0.5 h-4 w-4" fill="currentColor" stroke="none" />
          </span>
        </Link>
        <button
          type="button"
          onClick={() => {
            if (item.lastOpenedAt) setDismissedContinueReading(item.id, item.lastOpenedAt);
            setItem(null);
          }}
          aria-label="Dismiss"
          className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full text-ink-soft/50 transition-colors hover:text-ink"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}
