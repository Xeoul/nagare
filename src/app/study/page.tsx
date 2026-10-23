"use client";

import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { GrammarCard, KanjiCard, VocabRow } from "@/components/StudyCards";
import PageHeader from "@/components/PageHeader";
import ReferenceTable from "@/components/ReferenceTable";
import { REFERENCE } from "@/data/reference";
import { LEVELS, loadLevel, type GrammarItem, type KanjiItem, type Level, type LevelData, type VocabItem } from "@/lib/jlpt-data";

type Tab = "grammar" | "kanji" | "vocab" | "reference";
const TABS: { id: Tab; label: string }[] = [
  { id: "grammar", label: "Grammar" },
  { id: "kanji", label: "Kanji" },
  { id: "vocab", label: "Vocabulary" },
  { id: "reference", label: "Reference" },
];
const PAGE = 60;

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
