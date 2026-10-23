"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import LearnedButton from "@/components/LearnedButton";
import PageHeader from "@/components/PageHeader";
import { LEVELS, loadLevel, type Level, type LevelData } from "@/lib/jlpt-data";
import { resetProgress, statusOf, useProgress, type Progress } from "@/lib/progress";

const LEVEL_KEY = "nagare:path-level";
const QUIZ_KEY = "nagare:quiz-setup";
/** Share of a level's grammar and kanji studied before the next level is suggested. */
const READY = 0.7;

type Row = { id: string; title: string; sub: string };
type Group = { id: "grammar" | "kanji" | "vocab"; label: string; rows: Row[] };

function groupsOf(data: LevelData): Group[] {
  return [
    { id: "grammar", label: "Grammar", rows: data.grammar.map((g) => ({ id: `g:${g.id}`, title: g.p, sub: g.m })) },
    // Simpler kanji first: fewer strokes build the foundation for the rest.
    {
      id: "kanji",
      label: "Kanji",
      rows: [...data.kanji]
        .sort((a, b) => a.s - b.s)
        .map((k) => ({ id: `k:${k.c}`, title: k.c, sub: k.m.slice(0, 2).join(", ") })),
    },
    { id: "vocab", label: "Vocabulary", rows: data.vocab.map((v) => ({ id: `v:${v.w}`, title: v.w, sub: `${v.r !== v.w ? `${v.r} · ` : ""}${v.m[0] ?? ""}` })) },
  ];
}

function tally(rows: Row[], progress: Progress) {
  const t = { mastered: 0, learning: 0, weak: 0, new: 0 };
  for (const row of rows) t[statusOf(progress[row.id])]++;
  return t;
}

function Bar({ group, progress }: { group: Group; progress: Progress }) {
  const t = tally(group.rows, progress);
  const total = group.rows.length || 1;
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{group.label}</span>
        <span className="tabular-nums text-ink-soft">
          {t.mastered} mastered · {t.learning + t.weak} in progress · {t.new} new
        </span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-paper-sunk" role="img" aria-label={`${group.label}: ${t.mastered} of ${group.rows.length} mastered`}>
        <span className="bg-emerald-600" style={{ width: pct(t.mastered) }} />
        <span className="bg-emerald-300" style={{ width: pct(t.learning + t.weak) }} />
      </div>
    </div>
  );
}

function RowList({ rows }: { rows: Row[] }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {rows.map((row) => (
        <li key={row.id} className="flex items-center gap-3 py-2.5">
          <span className="min-w-12 text-xl font-bold" lang="ja">
            {row.title}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{row.sub}</span>
          <LearnedButton id={row.id} />
        </li>
      ))}
    </ul>
  );
}

function loadLevelPref(): Level {
  try {
    const saved = window.localStorage.getItem(LEVEL_KEY) as Level | null;
    if (saved && LEVELS.includes(saved)) return saved;
  } catch {
    // Default below.
  }
  return "N5";
}

export default function PathPage() {
  const progress = useProgress();
  const [level, setLevel] = useState<Level>(loadLevelPref);
  const [data, setData] = useState<LevelData | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void loadLevel(level).then((loaded) => {
      if (active) setData(loaded);
    });
    return () => {
      active = false;
    };
  }, [level]);

  function choose(next: Level) {
    setLevel(next);
    setData(undefined);
    try {
      window.localStorage.setItem(LEVEL_KEY, next);
    } catch {
      // Not remembering the level is fine.
    }
  }

  function toQuiz() {
    try {
      window.localStorage.setItem(QUIZ_KEY, JSON.stringify({ level, mode: "mixed" }));
    } catch {
      // The quiz falls back to its last setup.
    }
  }

  const groups = useMemo(() => (data ? groupsOf(data) : []), [data]);
  const review = useMemo(() => {
    const rows = groups.flatMap((g) => g.rows.filter((r) => statusOf(progress[r.id]) === "weak"));
    return rows.sort((a, b) => (progress[b.id]?.t ?? 0) - (progress[a.id]?.t ?? 0)).slice(0, 6);
  }, [groups, progress]);
  const next = useMemo(
    () => groups.map((g) => ({ group: g, rows: g.rows.filter((r) => statusOf(progress[r.id]) === "new").slice(0, g.id === "grammar" ? 3 : 5) })),
    [groups, progress],
  );

  const core = groups.filter((g) => g.id !== "vocab");
  const coreTotal = core.reduce((n, g) => n + g.rows.length, 0);
  const coreDone = core.reduce((n, g) => n + g.rows.filter((r) => statusOf(progress[r.id]) !== "new").length, 0);
  const ready = coreTotal > 0 && coreDone / coreTotal >= READY;
  const upNext = LEVELS[LEVELS.indexOf(level) + 1];
  const started = Object.keys(progress).length > 0;

  return (
    <div className="flex flex-1 flex-col lg:pl-60">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 pb-32 pt-4 sm:pt-8 lg:max-w-4xl lg:px-11 lg:pb-16 lg:pt-12">
        <PageHeader title="Path" />
        <p className="max-w-xl text-sm leading-relaxed text-ink-soft">
          Your route through JLPT study. Mark things as learned in Study, and every quiz answer adds to this. Quizzes lean on what you got
          wrong or just studied, and this page shows what to learn next.
        </p>

        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Level">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={level === l}
              onClick={() => choose(l)}
              className={`h-10 min-w-14 rounded-full px-4 text-sm font-semibold transition-colors ${
                level === l ? "bg-ink text-paper" : "bg-paper-raised text-ink-soft ring-1 ring-line hover:text-ink"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {data === undefined && <p className="text-sm text-ink-soft">Loading…</p>}
        {data === null && <p className="text-sm text-accent-warm">Couldn&apos;t load this level. Check your connection and try again.</p>}

        {data && (
          <>
            <section className="card flex flex-col gap-4 px-5 py-5">
              <h2 className="text-lg font-bold">{level} progress</h2>
              {groups.map((g) => (
                <Bar key={g.id} group={g} progress={progress} />
              ))}
              {ready && upNext ? (
                <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-800">
                  You&apos;ve covered {Math.round((coreDone / coreTotal) * 100)}% of {level} grammar and kanji. Ready for{" "}
                  <button type="button" onClick={() => choose(upNext)} className="underline underline-offset-4">
                    {upNext}
                  </button>
                  .
                </p>
              ) : (
                <p className="text-sm text-ink-soft">
                  Cover about {Math.round(READY * 100)}% of {level} grammar and kanji (now {Math.round((coreDone / (coreTotal || 1)) * 100)}%) and
                  the next level unlocks here.
                </p>
              )}
              <Link
                href="/quiz"
                onClick={toQuiz}
                className="flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-paper"
              >
                Practice {level}: weak and new first
              </Link>
            </section>

            {review.length > 0 && (
              <section className="card flex flex-col gap-1 px-5 py-4">
                <h2 className="text-lg font-bold">Review now</h2>
                <p className="text-sm text-ink-soft">You missed these last time.</p>
                <RowList rows={review} />
              </section>
            )}

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold">{started ? "Learn next" : "Start here"}</h2>
              {next.map(({ group, rows }) =>
                rows.length ? (
                  <div key={group.id} className="card flex flex-col gap-1 px-5 py-4">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">{group.label}</h3>
                    <RowList rows={rows} />
                  </div>
                ) : null,
              )}
              <Link href="/study" className="w-fit text-sm font-semibold underline underline-offset-4">
                Read the full {level} lists in Study
              </Link>
            </section>
          </>
        )}

        {started && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Clear all your progress on this device?")) resetProgress();
            }}
            className="w-fit text-xs font-semibold text-ink-soft underline underline-offset-4"
          >
            Reset progress
          </button>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
