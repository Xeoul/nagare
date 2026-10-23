"use client";

import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import FuriganaText from "@/components/FuriganaText";
import PageHeader from "@/components/PageHeader";
import { REFERENCE, type ReferenceSection } from "@/data/reference";
import { speak } from "@/lib/speech";
import { LEVELS, loadLevel, type GrammarItem, type KanjiItem, type Level, type LevelData, type VocabItem } from "@/lib/jlpt-data";

type Tab = "grammar" | "kanji" | "vocab" | "reference";
const TABS: { id: Tab; label: string }[] = [
  { id: "grammar", label: "Grammar" },
  { id: "kanji", label: "Kanji" },
  { id: "vocab", label: "Vocabulary" },
  { id: "reference", label: "Reference" },
];
const PAGE = 60;

/** One reference table. A cell like "か|ka" is a kana with its romaji; tapping it speaks it. */
function ReferenceTable({ section }: { section: ReferenceSection }) {
  const kana = section.rows.some((row) => row.some((cell) => cell.includes("|")));
  return (
    <li className="card flex flex-col gap-3 px-4 py-4 lg:px-5">
      <div>
        <h3 className="text-lg font-bold">{section.title}</h3>
        {section.intro && <p className="mt-0.5 text-sm text-ink-soft">{section.intro}</p>}
      </div>
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full border-collapse text-left text-sm">
          {section.head && (
            <thead>
              <tr>
                {section.head.map((h, i) => (
                  <th key={i} className="whitespace-nowrap px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {section.rows.map((row, ri) => (
              <tr key={ri} className="border-t border-line">
                {row.map((cell, ci) => {
                  if (cell.includes("|")) {
                    const [text, romaji] = cell.split("|");
                    return (
                      <td key={ci} className="px-1 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => speak(text)}
                          aria-label={`${text} (${romaji})`}
                          className="flex w-full min-w-11 flex-col items-center rounded-lg px-1 py-1 transition-colors hover:bg-paper-sunk"
                        >
                          <span className="text-2xl font-semibold leading-tight" lang="ja">
                            {text}
                          </span>
                          <span className="text-[11px] text-ink-soft">{romaji}</span>
                        </button>
                      </td>
                    );
                  }
                  return (
                    <td
                      key={ci}
                      lang="ja"
                      className={`px-2 py-2 align-top ${ci === 0 ? "whitespace-nowrap font-semibold" : ""} ${kana ? "text-center text-xs text-ink-soft" : ""}`}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {section.note && <p className="text-sm leading-relaxed text-ink-soft">{section.note}</p>}
    </li>
  );
}

function GrammarCard({ g }: { g: GrammarItem }) {
  return (
    <li className="card flex flex-col gap-2 px-5 py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-2xl font-bold" lang="ja">
          {g.p}
        </h3>
        <p className="text-sm font-semibold text-ink-soft">{g.m}</p>
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

function KanjiCard({ k }: { k: KanjiItem }) {
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
      <span className="shrink-0 text-xs text-ink-soft">{k.s} strokes</span>
    </li>
  );
}

function VocabRow({ v }: { v: VocabItem }) {
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

export default function StudyPage() {
  const [level, setLevel] = useState<Level>("N5");
  const [tab, setTab] = useState<Tab>("grammar");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<LevelData | null | undefined>(undefined);
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    let active = true;
    void loadLevel(level).then((loaded) => {
      if (active) setData(loaded);
    });
    return () => {
      active = false;
    };
  }, [level]);

  const needle = query.trim().toLowerCase();
  const items = useMemo(() => {
    if (!data) return [];
    if (tab === "grammar") {
      return data.grammar.filter((g) => !needle || `${g.p} ${g.m} ${g.f} ${g.t.join(" ")}`.toLowerCase().includes(needle));
    }
    if (tab === "kanji") {
      return data.kanji.filter(
        (k) => !needle || `${k.c} ${k.m.join(" ")} ${k.on.join(" ")} ${k.kun.join(" ")} ${k.w.join(" ")}`.toLowerCase().includes(needle),
      );
    }
    return data.vocab.filter((v) => !needle || `${v.w} ${v.r} ${v.m.join(" ")}`.toLowerCase().includes(needle));
  }, [data, tab, needle]);

  function select<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setShown(PAGE);
  }

  return (
    <div className="flex flex-1 flex-col lg:pl-60">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 pb-32 pt-4 sm:pt-8 lg:max-w-4xl lg:px-11 lg:pb-16 lg:pt-12">
        <PageHeader title="Study" />
        <p className="max-w-xl text-sm leading-relaxed text-ink-soft">
          Every grammar point, kanji and word for each JLPT level, with example sentences, plus kana charts, counters, particles and
          conjugation tables in Reference. Read a level, then test yourself in Quiz.
        </p>

        {tab !== "reference" && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Level">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={level === l}
              onClick={() => select(setLevel, l)}
              className={`h-10 min-w-14 rounded-full px-4 text-sm font-semibold transition-colors ${
                level === l ? "bg-ink text-paper" : "bg-paper-raised text-ink-soft ring-1 ring-line hover:text-ink"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-paper-sunk p-1" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => select(setTab, t.id)}
                className={`h-9 shrink-0 rounded-full px-3 text-sm font-semibold transition-colors sm:px-4 ${
                  tab === t.id ? "bg-paper-raised text-ink shadow-sm" : "text-ink-soft hover:text-ink"
                }`}
              >
                {t.label}
                {data && t.id !== "reference" && (
                  <span className="ml-1.5 text-xs font-medium tabular-nums opacity-60">
                    {t.id === "grammar" ? data.grammar.length : t.id === "kanji" ? data.kanji.length : data.vocab.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          {tab !== "reference" && (
          <input
            type="search"
            value={query}
            onChange={(event) => select(setQuery, event.target.value)}
            placeholder="Search"
            aria-label="Search"
            className="h-10 min-w-0 flex-1 rounded-full bg-paper-raised px-4 text-sm outline-none ring-1 ring-line focus:ring-ink sm:max-w-xs"
          />
          )}
        </div>

        {tab !== "reference" && data === undefined && <p className="text-sm text-ink-soft">Loading…</p>}
        {tab !== "reference" && data === null && <p className="text-sm text-accent-warm">Couldn&apos;t load this level. Check your connection and try again.</p>}
        {tab !== "reference" && data && items.length === 0 && <p className="text-sm text-ink-soft">Nothing matches that search.</p>}

        <ul className="flex flex-col gap-3">
          {tab === "reference" && REFERENCE.map((section) => <ReferenceTable key={section.id} section={section} />)}
          {tab === "grammar" && (items as GrammarItem[]).slice(0, shown).map((g) => <GrammarCard key={g.id} g={g} />)}
          {tab === "kanji" && (items as KanjiItem[]).slice(0, shown).map((k) => <KanjiCard key={k.c} k={k} />)}
          {tab === "vocab" && (items as VocabItem[]).slice(0, shown).map((v, i) => <VocabRow key={`${v.w}-${i}`} v={v} />)}
        </ul>

        {tab !== "reference" && items.length > shown && (
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE)}
            className="h-11 w-fit rounded-full bg-paper-raised px-6 text-sm font-semibold text-ink-soft ring-1 ring-line transition-colors hover:text-ink"
          >
            Show more ({items.length - shown} left)
          </button>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
