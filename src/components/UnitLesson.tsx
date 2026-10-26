"use client";

import { useState, type ReactNode } from "react";
import { GrammarCard, KanjiCard, VocabRow } from "@/components/StudyCards";
import type { Unit } from "@/lib/curriculum";

const KANJI_PER_STEP = 4;
const WORDS_PER_STEP = 6;

type Step = { label: string; tip: string; body: ReactNode };

const chunks = <T,>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

const Heading = ({ children }: { children: string }) => <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">{children}</h3>;

/** A unit taught one small step at a time, like chapters of a textbook: goals, grammar, kanji, words, review. */
export default function UnitLesson({ unit, footer }: { unit: Unit; footer: ReactNode }) {
  const [at, setAt] = useState(0);
  const kanjiSteps = chunks(unit.kanji, KANJI_PER_STEP);
  const wordSteps = chunks(unit.vocab, WORDS_PER_STEP);

  const goals = [
    unit.grammar.length > 0 && `${unit.grammar.length} grammar ${unit.grammar.length === 1 ? "point" : "points"}: ${unit.grammar.map((g) => g.p).join("、")}`,
    unit.kanji.length > 0 && `${unit.kanji.length} kanji: ${unit.kanji.map((k) => k.c).join(" ")}`,
    unit.vocab.length > 0 && `${unit.vocab.length} words that use them`,
  ].filter(Boolean) as string[];

  const steps: Step[] = [
    {
      label: "Goals",
      tip: "Take one step at a time. Nothing is tested until the end.",
      body: (
        <section className="card flex flex-col gap-3 px-5 py-5">
          <Heading>In this unit you will learn</Heading>
          <ul className="flex flex-col gap-2 text-[15px]" lang="ja">
            {goals.map((g) => (
              <li key={g} className="flex gap-2.5">
                <span className="text-ink-soft">•</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-soft">
            Then you will check yourself with a short quiz. {unit.pack ? "" : "Grammar comes first so you can read the example sentences, then the kanji, then the words built from them."}
          </p>
        </section>
      ),
    },
    ...unit.grammar.map((g, i) => ({
      label: `Grammar ${i + 1} of ${unit.grammar.length}`,
      tip: "Read the pattern, then say each example out loud.",
      body: <GrammarCard g={g} />,
    })),
    ...kanjiSteps.map((group, i) => ({
      label: `Kanji ${i + 1} of ${kanjiSteps.length}`,
      tip: "Look at the shape, then say the meaning and a reading for each one.",
      body: (
        <ul className="flex flex-col gap-3">
          {group.map((k) => (
            <KanjiCard key={k.c} k={k} />
          ))}
        </ul>
      ),
    })),
    ...wordSteps.map((group, i) => ({
      label: `Words ${i + 1} of ${wordSteps.length}`,
      tip: "Tap Listen, repeat each word, then read its example.",
      body: (
        <ul className="flex flex-col gap-3">
          {group.map((v, j) => (
            <VocabRow key={`${v.w}-${j}`} v={v} />
          ))}
        </ul>
      ),
    })),
  ];
  const last = steps.length; // the review step comes after every lesson step
  const step = steps[at];

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between text-xs font-semibold text-ink-soft">
          <span>{step ? step.label : "Review"}</span>
          <span className="tabular-nums">
            Step {at + 1} of {last + 1}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-paper-sunk">
          <span className="block h-full bg-ink transition-all" style={{ width: `${((at + 1) / (last + 1)) * 100}%` }} />
        </div>
      </div>

      {step ? (
        <>
          <p className="text-sm text-ink-soft">{step.tip}</p>
          {step.body}
        </>
      ) : (
        <section className="flex flex-col gap-4">
          <section className="card flex flex-col gap-2 px-5 py-5">
            <Heading>Review</Heading>
            <p className="text-[15px] leading-relaxed">
              You have been through everything in this unit. Skim anything that felt shaky (use the Back button), then check yourself. You need 70% to move on, and you can retry.
            </p>
          </section>
          {footer}
        </section>
      )}

      <div className="flex gap-2.5">
        {at > 0 && (
          <button type="button" onClick={() => setAt(at - 1)} className="h-12 rounded-full bg-paper-raised px-6 text-[15px] font-semibold ring-1 ring-line">
            Back
          </button>
        )}
        {at < last && (
          <button type="button" onClick={() => { setAt(at + 1); window.scrollTo({ top: 0 }); }} className="h-12 rounded-full bg-ink px-8 text-[15px] font-semibold text-paper active:scale-95">
            {at === last - 1 ? "Finish" : "Next"}
          </button>
        )}
      </div>
    </>
  );
}
