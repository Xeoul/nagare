"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listItems, removeItem, type LibraryItem } from "@/lib/library";
import { coverGlyph, coverStyle } from "@/lib/cover";
import { TrashIcon } from "./icons";

const KIND_LABEL: Record<LibraryItem["kind"], string> = {
  txt: "Text",
  epub: "EPUB",
  sample: "Sample",
  classic: "Aozora Bunko",
  starter: "Starter reading",
  reader: "Wikibooks",
};

export default function LibraryList() {
  const [items, setItems] = useState<LibraryItem[] | null>(null);

  useEffect(() => {
    void listItems().then(setItems);
  }, []);

  if (items === null) {
    return <p className="px-5 text-sm text-ink-soft">Loading your library…</p>;
  }

  if (items.length === 0) {
    return (
      <p className="px-5 text-sm text-ink-soft">
        Nothing here yet. Anything you open or import shows up here.
      </p>
    );
  }

  return (
    <ul className="mx-5 flex flex-col overflow-hidden rounded-[1.25rem] bg-paper-raised shadow-[0_0_0_1px_rgb(var(--shadow-color)/0.05),0_8px_24px_-12px_rgb(var(--shadow-color)/0.12)]">
      {items.map((item) => {
        const percent = Math.round(item.progress * 100);
        return (
          <li key={item.id} className="flex items-center gap-3.5 border-b border-line px-3.5 py-3 last:border-b-0">
            <Link href={`/read?id=${encodeURIComponent(item.id)}`} className="flex min-w-0 flex-1 items-center gap-3.5">
              <span
                style={coverStyle(item.title)}
                className="flex h-14 w-[2.625rem] shrink-0 items-end justify-end overflow-hidden rounded-lg"
              >
                <span className="-mb-1.5 -mr-0.5 text-3xl font-bold leading-none text-white/[0.1]">
                  {coverGlyph(item.title)}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{item.title}</span>
                <span className="block text-xs text-ink-soft">
                  {KIND_LABEL[item.kind]}
                  {percent > 0 && ` · ${percent}%`}
                </span>
                {percent > 0 && (
                  <span className="mt-1.5 block h-[3px] w-full max-w-40 overflow-hidden rounded-full bg-paper-sunk">
                    <span className="block h-full rounded-full bg-ink/50" style={{ width: `${percent}%` }} />
                  </span>
                )}
              </span>
            </Link>
            <button
              type="button"
              aria-label={`Remove ${item.title}`}
              onClick={() => {
                void removeItem(item.id).then(() =>
                  setItems((current) => current?.filter((existing) => existing.id !== item.id) ?? null),
                );
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft/70 transition-colors hover:bg-paper-sunk hover:text-accent-warm"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
