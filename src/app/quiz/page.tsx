"use client";

import { useCallback, useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { speak } from "@/lib/speech";
import {
  buildQuiz,
  GRAMMAR_LEVELS,
  LEVELS,
  type Level,
  type Mode,
  type Question,
} from "@/lib/quiz";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "mixed", label: "Mixed", hint: "Vocabulary, readings and grammar" },
  { id: "vocab", label: "Vocabulary", hint: "What does the word mean?" },
  { id: "reading", label: "Kanji readings", hint: "How is the word read?" },
  { id: "grammar", label: "Grammar", hint: "Fill the gap (N5 to N3)" },
];

const PREF_KEY = "nagare:quiz-setup";
const COUNT = 10;

function loadSetup(): { level: Level; mode: Mode } {
  if (typeof window === "undefined") return { level: "N5", mode: "mixed" };
  try {
    const saved = JSON.parse(window.localStorage.getItem(PREF_KEY) ?? "null") as { level?: Level; mode?: Mode } | null;
    if (saved?.level && LEVELS.includes(saved.level) && MODES.some((m) => m.id === saved.mode)) {
      return { level: saved.level, mode: saved.mode as Mode };
    }
  } catch {
    // No storage: fall back to the defaults.
  }
  return { level: "N5", mode: "mixed" };
}

type Missed = { question: Question; picked: number };

export default function QuizPage() {
  const [level, setLevel] = useState<Level>(() => loadSetup().level);
  const [mode, setMode] = useState<Mode>(() => loadSetup().mode);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<Missed[]>([]);

  const grammarUnavailable = mode === "grammar" && !GRAMMAR_LEVELS.includes(level);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      window.localStorage.setItem(PREF_KEY, JSON.stringify({ level, mode }));
    } catch {
      // Not saving the setup is fine.
    }
    const built = await buildQuiz(mode, level, COUNT);
    setLoading(false);
    if (!built) {
      setError("Couldn't load the word list. Check your connection and try again.");
      return;
    }
    setQuestions(built);
    setIndex(0);
    setPicked(null);
    setScore(0);
    setMissed([]);
  }

  const current = questions?.[index];
  const finished = questions !== null && index >= questions.length;

  const choose = useCallback(
    (choice: number) => {
      if (!current || picked !== null) return;
      setPicked(choice);
      if (choice === current.answer) setScore((s) => s + 1);
      else setMissed((m) => [...m, { question: current, picked: choice }]);
    },
    [current, picked],
  );

  const next = useCallback(() => {
    setPicked(null);
    setIndex((i) => i + 1);
  }, []);

  // 1-4 pick an answer, Enter or Space moves on (desktop).
  useEffect(() => {
    if (!current) return;
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (picked === null && /^[1-4]$/.test(event.key)) {
        choose(Number(event.key) - 1);
      } else if (picked !== null && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, picked, choose, next]);

  function quit() {
    setQuestions(null);
  }

  return (
    <div className="flex flex-1 flex-col lg:pl-60">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 pb-32 pt-4 sm:pt-8 lg:max-w-4xl lg:px-11 lg:pb-16 lg:pt-12">
        <PageHeader title="Quiz">
          {questions && !finished && (
            <button
              type="button"
              onClick={quit}
              className="rounded-full bg-paper-sunk px-3.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              End quiz
            </button>
          )}
        </PageHeader>

        {!questions && (
          <section className="flex flex-col gap-6">
            <p className="max-w-xl text-sm leading-relaxed text-ink-soft">
              JLPT-style multiple choice: {COUNT} questions, four choices each, with the answer explained after every one.
            </p>

            <div className="flex flex-col gap-2.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Level</h2>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Level">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={level === l}
                    onClick={() => setLevel(l)}
                    className={`h-11 min-w-16 rounded-full px-5 text-sm font-semibold transition-colors ${
                      level === l ? "bg-ink text-paper" : "bg-paper-raised text-ink-soft ring-1 ring-line hover:text-ink"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Practice</h2>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Practice type">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={mode === m.id}
                    onClick={() => setMode(m.id)}
                    className={`card flex flex-col items-start gap-0.5 px-4 py-3.5 text-left transition-colors ${
                      mode === m.id ? "ring-2 ring-ink" : "hover:bg-paper-sunk/50"
                    }`}
                  >
                    <span className="text-[15px] font-semibold">{m.label}</span>
                    <span className="text-xs text-ink-soft">{m.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {grammarUnavailable && (
              <p className="text-sm text-accent-warm">Grammar questions cover N5 to N3 for now. Pick one of those levels.</p>
            )}
            {error && <p className="text-sm text-accent-warm">{error}</p>}

            <button
              type="button"
              onClick={() => void start()}
              disabled={loading || grammarUnavailable}
              className="h-12 rounded-full bg-ink px-8 text-[15px] font-semibold text-paper transition-transform active:scale-95 disabled:opacity-40 sm:w-fit"
            >
              {loading ? "Loading…" : `Start ${level} quiz`}
            </button>
          </section>
        )}

        {questions && current && (
          <section className="flex flex-col gap-5" aria-live="polite">
            <div className="flex items-center gap-3 text-xs font-semibold text-ink-soft">
              <span className="tabular-nums">
                {index + 1} / {questions.length}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-sunk">
                <span
                  className="block h-full rounded-full bg-ink transition-[width] duration-300"
                  style={{ width: `${(index / questions.length) * 100}%` }}
                />
              </span>
              <span>{current.level}</span>
            </div>

            <div className="card flex flex-col items-center gap-2 px-5 py-8 text-center lg:py-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">{current.prompt}</p>
              <p
                className={`font-bold leading-snug ${
                  current.kind === "grammar" ? "text-2xl lg:text-3xl" : "text-5xl lg:text-6xl"
                }`}
                lang="ja"
              >
                {current.stem}
              </p>
              {current.kind !== "grammar" && picked !== null && current.reading && (
                <button
                  type="button"
                  onClick={() => speak(current.stem)}
                  className="rounded-full bg-paper-sunk px-3 py-1 text-sm text-ink-soft transition-colors hover:text-ink"
                  aria-label={`Listen to ${current.stem}`}
                >
                  {current.reading} · listen
                </button>
              )}
            </div>

            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {current.choices.map((choice, i) => {
                const isAnswer = i === current.answer;
                const isPicked = i === picked;
                const state =
                  picked === null
                    ? "bg-paper-raised ring-1 ring-line hover:bg-paper-sunk/60"
                    : isAnswer
                      ? "bg-emerald-500/15 ring-2 ring-emerald-600"
                      : isPicked
                        ? "bg-rose-500/15 ring-2 ring-rose-600"
                        : "bg-paper-raised opacity-50 ring-1 ring-line";
                return (
                  <li key={i}>
                    <button
                      type="button"
                      disabled={picked !== null}
                      onClick={() => choose(i)}
                      className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[17px] font-medium transition-colors ${state}`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-sunk text-xs font-semibold text-ink-soft">
                        {picked !== null && isAnswer ? "✓" : picked !== null && isPicked ? "✗" : i + 1}
                      </span>
                      <span className="min-w-0 flex-1" lang={current.kind === "vocab" ? "en" : "ja"}>
                        {choice}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {picked !== null && (
              <div className="card flex flex-col gap-3 px-5 py-4">
                <p className={`text-sm font-bold ${picked === current.answer ? "text-emerald-700" : "text-rose-700"}`}>
                  {picked === current.answer ? "Correct" : "Not quite"}
                </p>
                <p className="whitespace-pre-line text-sm leading-relaxed" lang="ja">
                  {current.explanation}
                </p>
                <button
                  type="button"
                  onClick={next}
                  className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-paper transition-transform active:scale-95 sm:w-fit"
                >
                  {index + 1 === questions.length ? "See results" : "Next"}
                </button>
              </div>
            )}
          </section>
        )}

        {questions && finished && (
          <section className="flex flex-col gap-5">
            <div className="card flex flex-col items-center gap-1 px-5 py-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">{level} result</p>
              <p className="text-6xl font-bold tabular-nums">
                {score}
                <span className="text-3xl text-ink-soft"> / {questions.length}</span>
              </p>
              <p className="text-sm text-ink-soft">
                {score === questions.length
                  ? "Perfect."
                  : score >= questions.length * 0.7
                    ? "Solid. Review the misses below."
                    : "Keep going: the misses below are the ones to remember."}
              </p>
            </div>

            {missed.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">To review</h2>
                <ul className="flex flex-col gap-2.5">
                  {missed.map(({ question, picked: wrong }, i) => (
                    <li key={i} className="card flex flex-col gap-1 px-4 py-3.5">
                      <p className="text-lg font-semibold" lang="ja">
                        {question.stem}
                      </p>
                      <p className="text-sm text-ink-soft">
                        You chose <span className="font-semibold text-rose-700">{question.choices[wrong]}</span>; the answer is{" "}
                        <span className="font-semibold text-emerald-700">{question.choices[question.answer]}</span>.
                      </p>
                      <p className="whitespace-pre-line text-xs leading-relaxed text-ink-soft" lang="ja">
                        {question.explanation}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => void start()}
                className="h-12 rounded-full bg-ink px-8 text-[15px] font-semibold text-paper transition-transform active:scale-95"
              >
                Another {level} quiz
              </button>
              <button
                type="button"
                onClick={quit}
                className="h-12 rounded-full bg-paper-raised px-6 text-[15px] font-semibold text-ink-soft ring-1 ring-line transition-colors hover:text-ink"
              >
                Change level
              </button>
            </div>
          </section>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
