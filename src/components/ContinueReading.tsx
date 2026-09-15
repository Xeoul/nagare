"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listItems, type LibraryItem } from "@/lib/library";
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

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
        Continue reading
      </h2>
      <div className="card card-interactive flex items-center gap-4 px-4 py-3">
        <Link href={`/read/${item.id}`} className="min-w-0 flex-1">
          <p className="truncate font-display text-lg">{item.title}</p>
          <p className="text-xs text-ink-soft">{Math.round(item.progress * 100)}% read</p>
        </Link>
        <button
          type="button"
          onClick={() => {
            if (item.lastOpenedAt) setDismissedContinueReading(item.id, item.lastOpenedAt);
            setItem(null);
          }}
          aria-label="Dismiss"
          className="shrink-0 text-lg text-ink-soft transition-colors hover:text-accent-warm"
        >
          ×
        </button>
      </div>
    </section>
  );
}
