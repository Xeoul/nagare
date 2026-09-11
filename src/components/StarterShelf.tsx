"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STARTER_READINGS, type StarterReading } from "@/data/starter-readings";
import { addItem, listItems } from "@/lib/library";

const LEVEL_ORDER: StarterReading["level"][] = ["N5", "N4"];

export default function StarterShelf() {
  const router = useRouter();
  const [loadingTitle, setLoadingTitle] = useState<string | null>(null);

  async function open(reading: StarterReading) {
    setLoadingTitle(reading.title);
    const existing = (await listItems()).find(
      (item) => item.kind === "starter" && item.title === reading.title,
    );
    const item =
      existing ??
      (await addItem({ title: reading.title, kind: "starter", text: reading.text }));
    router.push(`/read/${item.id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-ink-soft">
        Original short passages written for Nagare, checked word-by-word
        against real JLPT vocabulary lists — not adapted from anything
        published, and not native literature (see Classics below for that).
      </p>
      {LEVEL_ORDER.map((level) => {
        const readings = STARTER_READINGS.filter((r) => r.level === level);
        if (readings.length === 0) return null;
        return (
          <div key={level} className="flex flex-col gap-1">
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              {level}
            </h3>
            <ul className="flex flex-col divide-y divide-line">
              {readings.map((reading) => (
                <li key={reading.title} className="flex items-center gap-4 py-3">
                  <p className="min-w-0 flex-1 font-display text-lg">{reading.title}</p>
                  <button
                    type="button"
                    onClick={() => void open(reading)}
                    disabled={loadingTitle !== null}
                    className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    {loadingTitle === reading.title ? "Loading…" : "Open"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
