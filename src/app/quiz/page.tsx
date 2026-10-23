"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Results, Runner, type Report, type Session } from "@/components/QuizRunner";
import { recordAnswers } from "@/lib/progress";
import {
  buildMock,
  buildQuiz,
  LEVELS,
  type Level,
  type MockSection,
  type Mode,
  type Question,
} from "@/lib/quiz";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "mixed", label: "Mixed", hint: "Vocabulary, kanji and grammar" },
  { id: "vocab", label: "Vocabulary", hint: "Meanings and words in context" },
  { id: "reading", label: "Kanji and writing", hint: "Readings, kanji meanings, which kanji" },
  { id: "grammar", label: "Grammar", hint: "Pick the form that fits" },
  { id: "passage", label: "Reading comprehension", hint: "Read a passage, answer questions" },
  { id: "conjugation", label: "Conjugation", hint: "て-form, ない-form, potential and more" },
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

/** Text inside [[ ]] is underlined, the way the exam marks the word being asked about. */
export default function QuizPage() {
  const [level, setLevel] = useState<Level>(() => loadSetup().level);
  const [mode, setMode] = useState<Mode>(() => loadSetup().mode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  // A new key remounts the runner, so "another quiz" starts clean.
  const [runKey, setRunKey] = useState(0);

  async function start(mock: boolean) {
    setLoading(true);
    setError(null);
    try {
      window.localStorage.setItem(PREF_KEY, JSON.stringify({ level, mode }));
    } catch {
      // Not saving the setup is fine.
    }
    const sections: MockSection[] | null = mock
      ? await buildMock(level)
      : await buildQuiz(mode, level, COUNT).then((qs: Question[] | null) =>
          qs ? [{ id: "vocab", title: "Practice", minutes: 0, questions: qs }] : null,
        );
    setLoading(false);
    if (!sections) {
      setError("Couldn't load the study data. Check your connection and try again.");
      return;
    }
    setReport(null);
    setSession({ mock, level, sections });
    setRunKey((k) => k + 1);
  }

  // A mock test counts toward progress once it's handed in; practice counts per answer.
  const finish = useCallback((done: Report) => {
    if (done.session.mock) {
      recordAnswers(
        done.session.sections.flatMap((sec, si) =>
          sec.questions.flatMap((q, qi) => {
            const given = done.answers[si][qi];
            return q.item && given !== null ? [{ key: q.item, correct: given === q.answer }] : [];
          }),
        ),
      );
    }
    setReport(done);
  }, []);

  const reset = () => {
    setSession(null);
    setReport(null);
  };

  return (
    <div className="flex flex-1 flex-col lg:pl-60">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 pb-32 pt-4 sm:pt-8 lg:max-w-4xl lg:px-11 lg:pb-16 lg:pt-12">
        <PageHeader title="Quiz" />

        {!session && (
          <section className="flex flex-col gap-6">
            <p className="max-w-xl text-sm leading-relaxed text-ink-soft">
              JLPT-style multiple choice built on the exam&apos;s own question types. Not read the material yet?{" "}
              <Link href="/study" className="font-semibold text-ink underline underline-offset-4">
                Study it first
              </Link>
              .
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
                    className={`flex flex-col items-start gap-0.5 rounded-2xl px-4 py-3.5 text-left transition-colors ${
                      mode === m.id
                        ? "bg-ink text-paper"
                        : "card hover:bg-paper-sunk/50"
                    }`}
                  >
                    <span className="flex w-full items-center justify-between gap-2 text-[15px] font-semibold">
                      {m.label}
                      {mode === m.id && <span aria-hidden="true">✓</span>}
                    </span>
                    <span className={`text-xs ${mode === m.id ? "text-paper/70" : "text-ink-soft"}`}>{m.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-accent-warm">{error}</p>}

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => void start(false)}
                disabled={loading}
                className="h-12 rounded-full bg-ink px-8 text-[15px] font-semibold text-paper transition-transform active:scale-95 disabled:opacity-40"
              >
                {loading ? "Loading…" : `Start ${level} practice`}
              </button>
              <button
                type="button"
                onClick={() => void start(true)}
                disabled={loading}
                className="h-12 rounded-full bg-paper-raised px-6 text-[15px] font-semibold ring-1 ring-line transition-colors hover:bg-paper-sunk/60 disabled:opacity-40"
              >
                Timed mock test
              </button>
            </div>
            <p className="max-w-xl text-xs leading-relaxed text-ink-soft">
              Practice: {COUNT} questions with an explanation after each. Mock test: about 40 questions in three timed sections (vocabulary, grammar, reading),
              answers shown at the end. Questions are generated from open JLPT study data, not copied from past exams.
            </p>
          </section>
        )}

        {session && !report && <Runner key={runKey} session={session} onDone={finish} onQuit={reset} />}

        {session && report && <Results report={report} onAgain={() => void start(session.mock)} onChange={reset} />}
      </div>
      <BottomNav />
    </div>
  );
}
