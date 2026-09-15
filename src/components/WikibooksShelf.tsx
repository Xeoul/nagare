"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WIKIBOOKS_READERS, fetchReaderText, type WikibooksReader } from "@/lib/wikibooks-readers";
import { addItem, listItems } from "@/lib/library";

export default function WikibooksShelf() {
  const router = useRouter();
  const [loadingTitle, setLoadingTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function open(reader: WikibooksReader) {
    setError(null);
    setLoadingTitle(reader.title);
    try {
      const existing = (await listItems()).find(
        (item) => item.kind === "reader" && item.title === reader.title,
      );
      const item =
        existing ??
        (await addItem({
          title: reader.title,
          kind: "reader",
          text: await fetchReaderText(reader),
        }));
      router.push(`/read/${item.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't load that one.");
    } finally {
      setLoadingTitle(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-ink-soft">
        Real N5-level folk tales from{" "}
        <a
          href="https://en.wikibooks.org/wiki/Japanese/Reader"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-accent"
        >
          Wikibooks
        </a>{" "}
        (CC BY-SA 4.0) — genuine beginner-friendly native reading, which is
        hard to come by outside of graded readers.
      </p>
      <ul className="flex flex-col divide-y divide-line">
        {WIKIBOOKS_READERS.map((reader) => (
          <li key={reader.slug} className="flex items-center gap-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg">{reader.title}</p>
              <p className="text-xs text-ink-soft">
                {reader.author ? `${reader.author} · ${reader.note}` : reader.note}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void open(reader)}
              disabled={loadingTitle !== null}
              className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {loadingTitle === reader.title ? "Loading…" : "Open"}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-accent-warm">{error}</p>}
    </div>
  );
}
