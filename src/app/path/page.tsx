"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Results, Runner, type Report, type Session } from "@/components/QuizRunner";
import ReferenceTable from "@/components/ReferenceTable";
import { GrammarCard, KanjiCard, VocabRow } from "@/components/StudyCards";
import { REFERENCE } from "@/data/reference";
import { buildUnits, unitKey, type Unit } from "@/lib/curriculum";
import { LEVELS, loadLevel, type Level, type LevelData } from "@/lib/jlpt-data";
import { setLearned, statusOf, useProgress, type Progress } from "@/lib/progress";
import { buildUnitQuiz } from "@/lib/quiz";

const LEVEL_KEY = "nagare:path-level";
/** Share of a unit check that counts as passed. */
const PASS = 0.7;

const KANA_LESSONS = [
  { id: "hiragana", title: "Hiragana", sub: "The 46 basic sounds, then voiced and combined", sections: ["hiragana", "hiragana-voiced", "hiragana-combined"] },
  { id: "katakana", title: "Katakana", sub: "The same sounds, for foreign words and names", sections: ["katakana", "katakana-voiced", "katakana-combined"] },
];

type View =
  | { kind: "list" }
  | { kind: "kana"; id: string }
  | { kind: "unit"; unit: Unit }
  | { kind: "check"; unit: Unit; session: Session; run: number }
  | { kind: "result"; unit: Unit; report: Report; passed: boolean };

function loadLevelPref(): Level {
  try {
    const saved = window.localStorage.getItem(LEVEL_KEY) as Level | null;
    if (saved && LEVELS.includes(saved)) return saved;
  } catch {
    // Default below.
  }
  return "N5";
}

const studied = (unit: Unit, progress: Progress) => unit.keys.filter((k) => statusOf(progress[k]) !== "new").length;

function BackButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className="w-fit text-sm font-semibold text-ink-soft underline underline-offset-4 hover:text-ink">
      ← {children}
    </button>
  );
}

function UnitRow({ unit, level, progress, current, onOpen }: { unit: Unit; level: Level; progress: Progress; current: boolean; onOpen: () => void }) {
  const done = !!progress[unitKey(level, unit.n)]?.l;
  const seen = studied(unit, progress);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`card flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-paper-sunk/50 ${current ? "ring-2 ring-ink" : ""}`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            done ? "bg-emerald-600 text-white" : current ? "bg-ink text-paper" : "bg-paper-sunk text-ink-soft"
          }`}
        >
          {done ? "✓" : unit.n}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] font-semibold" lang="ja">
            {unit.title}
          </span>
          <span className="text-xs text-ink-soft">
            {unit.grammar.length} grammar · {unit.kanji.length} kanji · {unit.vocab.length} words
            {!done && seen > 0 ? ` · ${seen}/${unit.keys.length} studied` : ""}
          </span>
        </span>
        {current && <span className="shrink-0 rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-paper">Up next</span>}
      </button>
    </li>
  );
}

export default function PathPage() {
  const progress = useProgress();
  const [level, setLevel] = useState<Level>(loadLevelPref);
  const [data, setData] = useState<LevelData | null | undefined>(undefined);
  const [view, setView] = useState<View>({ kind: "list" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadLevel(level).then((loaded) => {
      if (active) setData(loaded);
    });
    return () => {
      active = false;
    };
  }, [level]);

  const units = useMemo(() => (data ? buildUnits(data) : []), [data]);
  const doneCount = units.filter((u) => progress[unitKey(level, u.n)]?.l).length;
  const next = units.find((u) => !progress[unitKey(level, u.n)]?.l);
  const kanaDone = (id: string) => !!progress[`u:kana:${id}`]?.l;
  const kanaOpen = level === "N5" ? KANA_LESSONS.find((k) => !kanaDone(k.id)) : undefined;

  function choose(l: Level) {
    setLevel(l);
    setData(undefined);
    setView({ kind: "list" });
    try {
      window.localStorage.setItem(LEVEL_KEY, l);
    } catch {
      // Not remembering the level is fine.
    }
  }

  async function startCheck(unit: Unit, run = 0) {
    setError(null);
    const questions = await buildUnitQuiz(level, unit.keys);
    if (!questions) {
      setError("Couldn't build a check for this unit. Try again.");
      return;
    }
    setView({
      kind: "check",
      unit,
      run,
      session: { mock: false, level, sections: [{ id: "vocab", title: "Unit check", minutes: 0, questions }] },
    });
  }

  function finishCheck(unit: Unit, report: Report) {
    const qs = report.session.sections[0].questions;
    const right = qs.filter((q, i) => report.answers[0][i] === q.answer).length;
    const passed = right / qs.length >= PASS;
    if (passed) setLearned(unitKey(level, unit.n), true);
    setView({ kind: "result", unit, report, passed });
  }

  let body;

  if (view.kind === "kana") {
    const lesson = KANA_LESSONS.find((k) => k.id === view.id);
    const sections = REFERENCE.filter((s) => lesson?.sections.includes(s.id));
    const done = kanaDone(view.id);
    body = (
      <>
        <BackButton onClick={() => setView({ kind: "list" })}>Path</BackButton>
        <h2 className="text-2xl font-bold">{lesson?.title}</h2>
        <p className="text-sm text-ink-soft">Tap a character to hear it. Learn a row at a time: say each one out loud and cover the romaji.</p>
        <ul className="flex flex-col gap-3">
          {sections.map((s) => (
            <ReferenceTable key={s.id} section={s} />
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            setLearned(`u:kana:${view.id}`, !done);
            if (!done) setView({ kind: "list" });
          }}
          className={`h-12 rounded-full px-8 text-[15px] font-semibold ${done ? "bg-paper-raised text-ink-soft ring-1 ring-line" : "bg-ink text-paper"}`}
        >
          {done ? "✓ Done. Tap to undo" : `I can read ${lesson?.title}`}
        </button>
      </>
    );
  } else if (view.kind === "unit") {
    const unit = view.unit;
    const done = !!progress[unitKey(level, unit.n)]?.l;
    const nextUnit = units[unit.n];
    body = (
      <>
        <BackButton onClick={() => setView({ kind: "list" })}>Path</BackButton>
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
            {level} · Unit {unit.n} of {units.length}
          </p>
          <h2 className="text-2xl font-bold" lang="ja">
            {unit.title}
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-ink-soft">
          Read the grammar first, then the kanji, then the words. Tap Listen on the words, say the examples out loud, then check yourself.
        </p>
        {unit.grammar.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">1. Grammar</h3>
            <ul className="flex flex-col gap-3">
              {unit.grammar.map((g) => (
                <GrammarCard key={g.id} g={g} />
              ))}
            </ul>
          </section>
        )}
        {unit.kanji.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">2. Kanji</h3>
            <ul className="flex flex-col gap-3">
              {unit.kanji.map((k) => (
                <KanjiCard key={k.c} k={k} />
              ))}
            </ul>
          </section>
        )}
        {unit.vocab.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">3. Words</h3>
            <ul className="flex flex-col gap-3">
              {unit.vocab.map((v, i) => (
                <VocabRow key={`${v.w}-${i}`} v={v} />
              ))}
            </ul>
          </section>
        )}
        {error && <p className="text-sm text-accent-warm">{error}</p>}
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={() => void startCheck(unit)} className="h-12 rounded-full bg-ink px-8 text-[15px] font-semibold text-paper active:scale-95">
            {done ? "Check again" : "Check yourself"}
          </button>
          {done && nextUnit && (
            <button
              type="button"
              onClick={() => setView({ kind: "unit", unit: nextUnit })}
              className="h-12 rounded-full bg-paper-raised px-6 text-[15px] font-semibold ring-1 ring-line"
            >
              Next unit
            </button>
          )}
        </div>
      </>
    );
  } else if (view.kind === "check") {
    body = (
      <Runner
        key={`${view.unit.id}-${view.run}`}
        session={view.session}
        onDone={(report) => finishCheck(view.unit, report)}
        onQuit={() => setView({ kind: "unit", unit: view.unit })}
      />
    );
  } else if (view.kind === "result") {
    const { unit, passed } = view;
    const nextUnit = units[unit.n];
    body = (
      <>
        <p className={`rounded-xl px-4 py-3 text-sm font-semibold ${passed ? "bg-emerald-600 text-white" : "bg-paper-sunk text-ink"}`}>
          {passed
            ? `Unit ${unit.n} complete.${nextUnit ? " The next unit is ready." : ` That's all of ${level}.`}`
            : `Not quite yet. Get ${Math.round(PASS * 100)}% to finish the unit. Read it again, then retry.`}
        </p>
        <Results report={view.report} onAgain={() => void startCheck(unit, Date.now())} onChange={() => setView({ kind: "unit", unit })} changeLabel="Back to the lesson" />
        {passed && nextUnit && (
          <button type="button" onClick={() => setView({ kind: "unit", unit: nextUnit })} className="h-12 w-fit rounded-full bg-ink px-8 text-[15px] font-semibold text-paper">
            Start unit {nextUnit.n}
          </button>
        )}
      </>
    );
  } else {
    body = (
      <>
        <p className="max-w-xl text-sm leading-relaxed text-ink-soft">
          A guided route through each level. Each unit teaches a few grammar points, the kanji, then the words that use them, and ends with
          a short check. Pass it to move on.
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
            <section className="card flex flex-col gap-3 px-5 py-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-bold">{level} route</h2>
                <span className="text-sm tabular-nums text-ink-soft">
                  {doneCount} of {units.length} units
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-paper-sunk">
                <span className="block h-full bg-emerald-600" style={{ width: `${(doneCount / (units.length || 1)) * 100}%` }} />
              </div>
              {kanaOpen ? (
                <button type="button" onClick={() => setView({ kind: "kana", id: kanaOpen.id })} className="h-12 rounded-full bg-ink px-6 text-[15px] font-semibold text-paper">
                  Start with {kanaOpen.title}
                </button>
              ) : next ? (
                <button type="button" onClick={() => setView({ kind: "unit", unit: next })} className="h-12 rounded-full bg-ink px-6 text-[15px] font-semibold text-paper">
                  {doneCount === 0 ? "Start" : "Continue"}: unit {next.n}
                </button>
              ) : (
                <p className="text-sm font-semibold text-emerald-700">You&apos;ve finished every {level} unit.</p>
              )}
            </section>

            {level === "N5" && (
              <section className="flex flex-col gap-2.5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Start here: the kana</h2>
                <ul className="flex flex-col gap-2.5">
                  {KANA_LESSONS.map((k) => (
                    <li key={k.id}>
                      <button
                        type="button"
                        onClick={() => setView({ kind: "kana", id: k.id })}
                        className="card flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-paper-sunk/50"
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            kanaDone(k.id) ? "bg-emerald-600 text-white" : "bg-paper-sunk text-ink-soft"
                          }`}
                          lang="ja"
                        >
                          {kanaDone(k.id) ? "✓" : k.id === "hiragana" ? "あ" : "ア"}
                        </span>
                        <span className="flex flex-col gap-0.5">
                          <span className="text-[15px] font-semibold">{k.title}</span>
                          <span className="text-xs text-ink-soft">{k.sub}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="flex flex-col gap-2.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Units</h2>
              <ul className="flex flex-col gap-2.5">
                {units.map((u) => (
                  <UnitRow
                    key={u.id}
                    unit={u}
                    level={level}
                    progress={progress}
                    current={!kanaOpen && next?.n === u.n}
                    onOpen={() => setView({ kind: "unit", unit: u })}
                  />
                ))}
              </ul>
            </section>

            <p className="text-sm text-ink-soft">
              Want a free-for-all instead? Browse everything in{" "}
              <Link href="/study" className="font-semibold text-ink underline underline-offset-4">
                Study
              </Link>{" "}
              or drill in{" "}
              <Link href="/quiz" className="font-semibold text-ink underline underline-offset-4">
                Quiz
              </Link>
              . Words you&apos;ve studied show up there more often.
            </p>
          </>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-1 flex-col lg:pl-60">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 pb-32 pt-4 sm:pt-8 lg:max-w-4xl lg:px-11 lg:pb-16 lg:pt-12">
        <PageHeader title="Path" />
        {body}
      </div>
      <BottomNav />
    </div>
  );
}
