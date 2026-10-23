"use client";

import FuriganaText from "@/components/FuriganaText";
import LearnedButton from "@/components/LearnedButton";
import { speak } from "@/lib/speech";
import type { GrammarItem, KanjiItem, VocabItem } from "@/lib/jlpt-data";

export function GrammarCard({ g }: { g: GrammarItem }) {
  return (
    <li className="card flex flex-col gap-2 px-5 py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-2xl font-bold" lang="ja">
          {g.p}
        </h3>
        <p className="text-sm font-semibold text-ink-soft">{g.m}</p>
        <span className="ml-auto">
          <LearnedButton id={`g:${g.id}`} />
        </span>
      </div>
      <p className="w-fit rounded-lg bg-paper-sunk px-2.5 py-1 text-xs text-ink-soft">{g.f}</p>
      {g.n && <p className="text-sm leading-relaxed">{g.n}</p>}
      <ul className="mt-1 flex flex-col gap-2.5">
        {g.e.map((ex, i) => (
          <li key={i} className="border-l-2 border-line pl-3">
            <p className="text-[17px] leading-[2.1]">
              <FuriganaText text={ex.j} furigana={ex.f} />
            </p>
            <p className="text-sm text-ink-soft">{ex.en}</p>
          </li>
        ))}
      </ul>
    </li>
  );
}

export function KanjiCard({ k }: { k: KanjiItem }) {
  return (
    <li className="card flex gap-4 px-4 py-4">
      <p className="w-16 shrink-0 text-center text-5xl font-bold leading-none" lang="ja">
        {k.c}
      </p>
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        <p className="font-semibold">{k.m.join(", ")}</p>
        <p className="text-ink-soft" lang="ja">
          <span className="font-semibold text-ink">On</span> {k.on.join("、") || "—"}
          <span className="px-2">·</span>
          <span className="font-semibold text-ink">Kun</span> {k.kun.join("、") || "—"}
        </p>
        {k.w.length > 0 && (
          <p className="text-ink-soft" lang="ja">
            {k.w.join("、")}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="text-xs text-ink-soft">{k.s} strokes</span>
        <LearnedButton id={`k:${k.c}`} />
      </div>
    </li>
  );
}

export function VocabRow({ v }: { v: VocabItem }) {
  const ex = v.e[0];
  return (
    <li className="card flex flex-col gap-1.5 px-4 py-3.5">
      <div className="flex items-baseline gap-3">
        <p className="text-xl font-bold" lang="ja">
          {v.w}
        </p>
        {v.r !== v.w && (
          <p className="text-sm text-ink-soft" lang="ja">
            {v.r}
          </p>
        )}
        <button
          type="button"
          onClick={() => speak(v.w)}
          aria-label={`Listen to ${v.w}`}
          className="ml-auto rounded-full bg-paper-sunk px-2.5 py-0.5 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          Listen
        </button>
        <LearnedButton id={`v:${v.w}`} />
      </div>
      <p className="text-sm">{v.m.join("; ")}</p>
      {ex && (
        <div className="border-l-2 border-line pl-3">
          <p className="text-[15px] leading-[2]">
            <FuriganaText text={ex.j} furigana={ex.f} />
          </p>
          <p className="text-xs text-ink-soft">{ex.en}</p>
        </div>
      )}
    </li>
  );
}
