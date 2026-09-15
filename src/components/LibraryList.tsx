"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listItems, removeItem, type LibraryItem } from "@/lib/library";

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
    return <p className="text-sm text-ink-soft">Loading your library…</p>;
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Nothing imported yet — add a file above, or try a starter reading or
        classic below.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-4 py-3">
          <Link href={`/read/${item.id}`} className="min-w-0 flex-1">
            <p className="truncate font-medium">{item.title}</p>
            <p className="text-xs text-ink-soft">
              {KIND_LABEL[item.kind]}
              {item.progress > 0 && ` · ${Math.round(item.progress * 100)}% read`}
            </p>
          </Link>
          <button
            type="button"
            onClick={() => {
              void removeItem(item.id).then(() =>
                setItems((current) => current?.filter((existing) => existing.id !== item.id) ?? null),
              );
            }}
            className="shrink-0 text-xs text-ink-soft hover:text-accent-warm"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
