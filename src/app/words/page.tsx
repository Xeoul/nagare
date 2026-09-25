"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadContent, type Content } from "@/lib/content";
import { LEARNED_STAGE, loadProgress, saveProgress, stats, toggleSaved, type Progress } from "@/lib/progress";

type Row = { id: string; label: string; reading?: string; meaning: string; stage: number; due: number };

function describeDue(due: number, now: number): string {
  const ms = due - now;
  if (ms <= 0) return "due now";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `in ${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} h`;
  return `in ${Math.round(hours / 24)} d`;
}

/** Stage as a row of dots: filled up to the item's stage, out of the full ladder. */
function StageDots({ stage }: { stage: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`Stage ${stage} of 7`}>
      {Array.from({ length: 7 }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${
            i < stage ? (stage >= LEARNED_STAGE ? "bg-good" : "bg-accent") : "bg-line"
          }`}
        />
      ))}
    </span>
  );
}

export default function WordsPage() {
  const [content, setContent] = useState<Content | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    void Promise.all([loadContent(), loadProgress()]).then(([c, p]) => {
      setContent(c);
      setProgress(p);
    });
  }, []);

  if (!content || !progress) {
    return <p className="p-8 text-sm text-ink-soft">Loading…</p>;
  }

  const lookup = (key: string) => {
    const word = content.words.find((w) => w.key === key);
    const gloss = content.glossary[key];
    return { reading: word?.reading ?? gloss?.r, meaning: word?.meaning ?? gloss?.m ?? "" };
  };

  const rows: Row[] = Object.entries(progress.items)
    .map(([id, state]) => {
      if (id.startsWith("g:")) {
        const point = content.grammar.find((g) => `g:${g.id}` === id);
        return point
          ? { id, label: point.pattern, meaning: point.title, stage: state.stage, due: state.due }
          : null;
      }
      const key = id.slice(2);
      return { id, label: key, ...lookup(key), stage: state.stage, due: state.due };
    })
    .filter((row): row is Row => row !== null)
    .sort((a, b) => a.due - b.due);

  const { learned, learning, due } = stats(progress, now);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 p-5 sm:p-8">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="text-sm text-ink-soft transition-colors hover:text-accent">
          ← Back to feed
        </Link>
        <h1 className="text-sm font-medium text-ink-soft">Your progress</h1>
      </header>

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Learned", learned],
          ["Learning", learning],
          ["Due", due],
        ].map(([label, value]) => (
          <div key={label} className="card px-4 py-3">
            <p className="font-display text-3xl font-bold">{value}</p>
            <p className="text-xs text-ink-soft">{label}</p>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium tracking-[0.12em] text-ink-soft uppercase">Saved</h2>
        {progress.saved.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Nothing saved yet. Tap any word in the feed, then Save, to collect it here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {progress.saved.map((key) => {
              const { reading, meaning } = lookup(key);
              return (
                <li key={key} className="card flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p lang="ja" className="font-display text-xl">
                      {key}
                      {reading && reading !== key && <span className="ml-2 text-sm text-ink-soft">{reading}</span>}
                    </p>
                    <p className="truncate text-sm text-ink-soft">{meaning}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = toggleSaved(progress, key);
                      setProgress(next);
                      saveProgress(next);
                    }}
                    className="shrink-0 text-xs text-ink-soft hover:text-bad"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium tracking-[0.12em] text-ink-soft uppercase">In review</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-ink-soft">Start swiping — words and grammar you meet land here.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line/60">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p lang="ja" className="font-display text-lg leading-tight">
                    {row.label}
                    {row.reading && row.reading !== row.label && (
                      <span className="ml-2 text-xs text-ink-soft">{row.reading}</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-soft">{row.meaning}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StageDots stage={row.stage} />
                  <span className="text-[11px] text-ink-soft">{describeDue(row.due, now)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="border-t border-line/70 pt-5 text-xs text-ink-soft">
        Lessons are original to Nagare. Some tap-to-see meanings come from{" "}
        <a href="https://www.edrdg.org/jmdict/j_jmdict.html" target="_blank" rel="noreferrer" className="underline hover:text-accent">
          JMdict
        </a>{" "}
        by the EDRDG, used under{" "}
        <a href="https://www.edrdg.org/edrdg/licence.html" target="_blank" rel="noreferrer" className="underline hover:text-accent">
          CC BY-SA 4.0
        </a>
        . JLPT levels from{" "}
        <a href="https://github.com/elzup/jlpt-word-list" target="_blank" rel="noreferrer" className="underline hover:text-accent">
          elzup/jlpt-word-list
        </a>
        .
      </footer>
    </div>
  );
}
