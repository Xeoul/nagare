"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { recordAnswers } from "@/lib/progress";
import { speak } from "@/lib/speech";
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
function Stem({ text }: { text: string }) {
  return (
    <>
      {text.split(/\[\[(.+?)\]\]/).map((part, i) =>
        i % 2 ? (
          <u key={i} className="underline decoration-2 underline-offset-[6px]">
            {part}
          </u>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

const plainStem = (text: string) => text.replace(/\[\[(.+?)\]\]/g, "$1");

type Session = {
  /** Practice gives feedback after each answer; a mock test only at the end. */
  mock: boolean;
  level: Level;
  sections: MockSection[];
};

type Report = {
  session: Session;
  /** answers[section][question] is the choice index, or null if skipped. */
  answers: (number | null)[][];
  secondsUsed: number;
};

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function Runner({ session, onDone, onQuit }: { session: Session; onDone: (report: Report) => void; onQuit: () => void }) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [intro, setIntro] = useState(session.mock);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const answers = useRef<(number | null)[][]>(session.sections.map((s) => s.questions.map(() => null)));
  const [secondsLeft, setSecondsLeft] = useState(0);
  const used = useRef(0);

  const section = session.sections[sectionIndex];
  const current = section.questions[index];
  const reveal = !session.mock && picked !== null;

  const finishSection = useCallback(() => {
    if (sectionIndex + 1 < session.sections.length) {
      setSectionIndex(sectionIndex + 1);
      setIndex(0);
      setPicked(null);
      setIntro(true);
    } else {
      onDone({ session, answers: answers.current, secondsUsed: used.current });
    }
  }, [sectionIndex, session, onDone]);

  const beginSection = useCallback(() => {
    setSecondsLeft(session.sections[sectionIndex].minutes * 60);
    setIntro(false);
  }, [session, sectionIndex]);

  // The mock test's clock: runs while a section is open and ends it at zero.
  useEffect(() => {
    if (!session.mock || intro) return;
    const id = window.setTimeout(() => {
      used.current += 1;
      if (secondsLeft <= 1) finishSection();
      else setSecondsLeft(secondsLeft - 1);
    }, 1000);
    return () => window.clearTimeout(id);
  }, [session.mock, intro, secondsLeft, finishSection]);

  const choose = useCallback(
    (choice: number) => {
      if (!current || intro) return;
      if (!session.mock && picked !== null) return;
      setPicked(choice);
      answers.current[sectionIndex][index] = choice;
      if (!session.mock && current.item) recordAnswers([{ key: current.item, correct: choice === current.answer }]);
    },
    [current, intro, session.mock, picked, sectionIndex, index],
  );

  const next = useCallback(() => {
    if (index + 1 < section.questions.length) {
      setIndex(index + 1);
      setPicked(answers.current[sectionIndex][index + 1]);
    } else {
      finishSection();
    }
  }, [index, section, sectionIndex, finishSection]);

  const back = useCallback(() => {
    if (index === 0) return;
    setIndex(index - 1);
    setPicked(answers.current[sectionIndex][index - 1]);
  }, [index, sectionIndex]);

  // 1-4 pick an answer; Enter or Space moves on (desktop).
  useEffect(() => {
    if (intro) return;
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (/^[1-4]$/.test(event.key)) choose(Number(event.key) - 1);
      else if ((event.key === "Enter" || event.key === " ") && (session.mock || picked !== null)) {
        event.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [intro, choose, next, picked, session.mock]);

  if (intro) {
    return (
      <section className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
          {session.level} mock test · section {sectionIndex + 1} of {session.sections.length}
        </p>
        <h2 className="text-2xl font-bold">{section.title}</h2>
        <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
          {section.questions.length} questions, {section.minutes} minutes. No answers are shown until the end, and the section closes
          when time runs out. You can go back to change an answer.
        </p>
        <button
          type="button"
          onClick={beginSection}
          className="mt-2 h-12 rounded-full bg-ink px-8 text-[15px] font-semibold text-paper transition-transform active:scale-95"
        >
          Start section
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5" aria-live="polite">
      <div className="flex items-center gap-3 text-xs font-semibold text-ink-soft">
        <span className="tabular-nums">
          {index + 1} / {section.questions.length}
        </span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-sunk">
          <span
            className="block h-full rounded-full bg-ink transition-[width] duration-300"
            style={{ width: `${(index / section.questions.length) * 100}%` }}
          />
        </span>
        {session.mock ? (
          <span className={`tabular-nums ${secondsLeft < 60 ? "text-rose-700" : ""}`}>{clock(secondsLeft)}</span>
        ) : (
          <span>{current.level}</span>
        )}
      </div>

      {current.passage && (
        <div className="card flex flex-col gap-2 px-5 py-5 lg:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">{current.prompt}</p>
          <p className="whitespace-pre-line text-[17px] leading-[2] lg:text-lg" lang="ja">
            {current.passage}
          </p>
        </div>
      )}

      <div className={`card flex flex-col items-center gap-2 px-5 text-center ${current.passage ? "py-5" : "py-8 lg:py-10"}`}>
        {!current.passage && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">{current.prompt}</p>}
        <p
          className={`font-bold leading-relaxed ${
            current.passage ? "text-xl lg:text-2xl" : current.stem.length > 4 ? "text-2xl lg:text-3xl" : "text-5xl leading-snug lg:text-6xl"
          }`}
          lang="ja"
        >
          <Stem text={current.stem} />
        </p>
        {reveal && current.reading && (
          <button
            type="button"
            onClick={() => speak(plainStem(current.stem))}
            className="rounded-full bg-paper-sunk px-3 py-1 text-sm text-ink-soft transition-colors hover:text-ink"
            aria-label="Listen"
          >
            {current.reading} · listen
          </button>
        )}
      </div>

      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {current.choices.map((choice, i) => {
          const isAnswer = i === current.answer;
          const isPicked = i === picked;
          const state = reveal
            ? isAnswer
              ? "bg-emerald-500/15 ring-2 ring-emerald-600"
              : isPicked
                ? "bg-rose-500/15 ring-2 ring-rose-600"
                : "bg-paper-raised opacity-50 ring-1 ring-line"
            : isPicked
              ? "bg-paper-sunk ring-2 ring-ink"
              : "bg-paper-raised ring-1 ring-line hover:bg-paper-sunk/60";
          return (
            <li key={i}>
              <button
                type="button"
                disabled={reveal}
                onClick={() => choose(i)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[17px] font-medium transition-colors ${state}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-sunk text-xs font-semibold text-ink-soft">
                  {reveal && isAnswer ? "✓" : reveal && isPicked ? "✗" : i + 1}
                </span>
                <span className="min-w-0 flex-1" lang={/[　-鿿]/.test(choice) ? "ja" : "en"}>
                  {choice}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {reveal && (
        <div className="card flex flex-col gap-3 px-5 py-4">
          <p className={`text-sm font-bold ${picked === current.answer ? "text-emerald-700" : "text-rose-700"}`}>
            {picked === current.answer ? "Correct" : "Not quite"}
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed" lang="ja">
            {current.explanation}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2.5">
        {session.mock && (
          <button
            type="button"
            onClick={back}
            disabled={index === 0}
            className="h-11 rounded-full bg-paper-raised px-5 text-sm font-semibold text-ink-soft ring-1 ring-line transition-colors hover:text-ink disabled:opacity-40"
          >
            Back
          </button>
        )}
        {(session.mock || reveal) && (
          <button
            type="button"
            onClick={next}
            className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-paper transition-transform active:scale-95"
          >
            {index + 1 === section.questions.length
              ? sectionIndex + 1 === session.sections.length
                ? "Finish"
                : "End section"
              : session.mock && picked === null
                ? "Skip"
                : "Next"}
          </button>
        )}
        <button
          type="button"
          onClick={onQuit}
          className="ml-auto rounded-full px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          End quiz
        </button>
      </div>
    </section>
  );
}

function Results({ report, onAgain, onChange }: { report: Report; onAgain: () => void; onChange: () => void }) {
  const { session, answers } = report;
  const sectionScores = session.sections.map((s, si) => ({
    title: s.title,
    correct: s.questions.filter((q, qi) => answers[si][qi] === q.answer).length,
    total: s.questions.length,
  }));
  const correct = sectionScores.reduce((n, s) => n + s.correct, 0);
  const total = sectionScores.reduce((n, s) => n + s.total, 0);
  const missed = session.sections.flatMap((s, si) =>
    s.questions.flatMap((q, qi) => (answers[si][qi] === q.answer ? [] : [{ q, picked: answers[si][qi] }])),
  );

  return (
    <section className="flex flex-col gap-5">
      <div className="card flex flex-col items-center gap-1 px-5 py-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
          {session.level} {session.mock ? "mock test" : "quiz"} result
        </p>
        <p className="text-6xl font-bold tabular-nums">
          {correct}
          <span className="text-3xl text-ink-soft"> / {total}</span>
        </p>
        <p className="max-w-md text-sm text-ink-soft">
          {Math.round((correct / total) * 100)}%
          {session.mock && ` · ${clock(report.secondsUsed)} used`}
          {session.mock && ". The real JLPT scores differently (scaled, pass/fail per section), so treat this as a guide."}
        </p>
        {session.mock && (
          <ul className="mt-3 flex w-full max-w-sm flex-col gap-1.5 text-sm">
            {sectionScores.map((s) => (
              <li key={s.title} className="flex justify-between gap-4">
                <span className="text-ink-soft">{s.title}</span>
                <span className="font-semibold tabular-nums">
                  {s.correct} / {s.total}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {missed.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">To review ({missed.length})</h2>
          <ul className="flex flex-col gap-2.5">
            {missed.map(({ q, picked }, i) => (
              <li key={i} className="card flex flex-col gap-1 px-4 py-3.5">
                <p className="text-lg font-semibold" lang="ja">
                  <Stem text={q.stem} />
                </p>
                <p className="text-sm text-ink-soft">
                  {picked === null ? (
                    "Skipped"
                  ) : (
                    <>
                      You chose <span className="font-semibold text-rose-700">{q.choices[picked]}</span>
                    </>
                  )}
                  ; the answer is <span className="font-semibold text-emerald-700">{q.choices[q.answer]}</span>.
                </p>
                <p className="whitespace-pre-line text-xs leading-relaxed text-ink-soft" lang="ja">
                  {q.explanation}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={onAgain}
          className="h-12 rounded-full bg-ink px-8 text-[15px] font-semibold text-paper transition-transform active:scale-95"
        >
          {session.mock ? `Another ${session.level} mock test` : `Another ${session.level} quiz`}
        </button>
        <button
          type="button"
          onClick={onChange}
          className="h-12 rounded-full bg-paper-raised px-6 text-[15px] font-semibold text-ink-soft ring-1 ring-line transition-colors hover:text-ink"
        >
          Change setup
        </button>
      </div>
    </section>
  );
}

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
