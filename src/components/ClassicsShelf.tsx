"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CLASSICS, fetchClassicText, type ClassicWork } from "@/lib/aozora";
import { addItem, listItems } from "@/lib/library";

export default function ClassicsShelf() {
  const router = useRouter();
  const [loadingTitle, setLoadingTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function open(work: ClassicWork) {
    setError(null);
    setLoadingTitle(work.title);
    try {
      const existing = (await listItems()).find(
        (item) => item.kind === "classic" && item.title === work.title,
      );
      const item =
        existing ??
        (await addItem({
          title: work.title,
          kind: "classic",
          text: await fetchClassicText(work),
        }));
      router.push(`/read/${item.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't load that one.");
    } finally {
      setLoadingTitle(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-ink-soft">
        Public-domain Japanese literature from{" "}
        <a
          href="https://www.aozora.gr.jp/"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-accent"
        >
          Aozora Bunko
        </a>
        . Native text, not leveled — expect roughly N2 and up.
      </p>
      <ul className="flex flex-col divide-y divide-line">
        {CLASSICS.map((work) => (
          <li key={work.path} className="flex items-center gap-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg">{work.title}</p>
              <p className="text-xs text-ink-soft">
                {work.author} · {work.note}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void open(work)}
              disabled={loadingTitle !== null}
              className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {loadingTitle === work.title ? "Loading…" : "Open"}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-accent-warm">{error}</p>}
    </div>
  );
}
