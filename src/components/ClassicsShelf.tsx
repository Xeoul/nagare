"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CLASSICS, fetchClassicText, type ClassicWork } from "@/lib/aozora";
import { addItem, listItems } from "@/lib/library";

const LEVEL_ORDER: ClassicWork["level"][] = ["N3", "N2"];

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
    <div className="flex flex-col gap-4">
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
        . Levels are estimated from vocabulary coverage, not an official
        grading — and native literature just doesn&apos;t read as true N5/N4,
        even a children&apos;s story here. Graded readers are a different
        genre for that; this shelf runs N3–N2.
      </p>
      {LEVEL_ORDER.map((level) => {
        const works = CLASSICS.filter((w) => w.level === level).sort(
          (a, b) => a.density - b.density,
        );
        if (works.length === 0) return null;
        return (
          <div key={level} className="flex flex-col gap-1">
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              Estimated {level}
            </h3>
            <ul className="flex flex-col divide-y divide-line">
              {works.map((work) => (
                <li key={work.path} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg">{work.title}</p>
                    <p className="text-xs text-ink-soft">
                      {work.author} · {work.note}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {work.density}% of its vocabulary is outside any JLPT list
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
          </div>
        );
      })}
      {error && <p className="text-sm text-accent-warm">{error}</p>}
    </div>
  );
}
