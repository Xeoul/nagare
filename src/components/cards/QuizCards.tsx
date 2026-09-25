"use client";

import { useState, type ReactNode } from "react";
import type { GrammarPoint } from "@/lib/content";
import type { WordQuizMode } from "@/lib/feed";
import TokenLine from "../TokenLine";
import { useFeed } from "../FeedContext";
import { CardShell } from "./Shared";

const MODE_QUESTION: Record<WordQuizMode, string> = {
  meaning: "What does it mean?",
  reading: "How do you read it?",
  reverse: "Which word means…",
};

function Options({
  options,
  answer,
  picked,
  onPick,
  japanese,
}: {
  options: string[];
  answer: string;
  picked: string | null;
  onPick: (option: string) => void;
  japanese: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5">
      {options.map((option) => {
        const state =
          picked === null
            ? "idle"
            : option === answer
              ? "right"
              : option === picked
                ? "wrong"
                : "dim";
        return (
          <button
            key={option}
            type="button"
            disabled={picked !== null}
            onClick={() => onPick(option)}
            lang={japanese ? "ja" : undefined}
            className={`rounded-2xl border px-4 py-3.5 text-left transition-all active:scale-[0.98] ${
              japanese ? "font-display text-2xl" : "text-lg"
            } ${
              state === "right"
                ? "border-good bg-good/15 text-ink"
                : state === "wrong"
                  ? "border-bad bg-bad/15 text-ink"
                  : state === "dim"
                    ? "border-line/50 text-ink-soft/60"
                    : "border-line bg-paper/70 hover:border-accent"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function Verdict({ correct, children }: { correct: boolean; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-paper/70 px-4 py-3">
      <p className={`text-sm font-semibold ${correct ? "text-good" : "text-bad"}`}>
        {correct ? "Nice — this one will come back later." : "Not quite — you'll see it again soon."}
      </p>
      {children}
    </div>
  );
}

export function WordQuizCard({
  wordKey,
  mode,
  prompt,
  options,
  answer,
  onAnswer,
}: {
  wordKey: string;
  mode: WordQuizMode;
  prompt: string;
  options: string[];
  answer: string;
  onAnswer: (correct: boolean) => void;
}) {
  const { content } = useFeed();
  const [picked, setPicked] = useState<string | null>(null);
  const word = content.words.find((w) => w.key === wordKey);
  const gloss = content.glossary[wordKey];
  const reading = word?.reading ?? gloss?.r;
  const meaning = word?.meaning ?? gloss?.m;

  return (
    <CardShell tint="quiz" label="Quick check" meta={MODE_QUESTION[mode]}>
      <h2
        lang={mode === "reverse" ? undefined : "ja"}
        className={mode === "reverse" ? "text-3xl leading-snug" : "font-display text-6xl font-bold"}
      >
        {prompt}
      </h2>

      <Options
        options={options}
        answer={answer}
        picked={picked}
        japanese={mode !== "meaning"}
        onPick={(option) => {
          setPicked(option);
          onAnswer(option === answer);
        }}
      />

      {picked !== null && (
        <Verdict correct={picked === answer}>
          <p className="text-base">
            <span lang="ja" className="font-display text-lg">{wordKey}</span>
            {reading && reading !== wordKey && (
              <span lang="ja" className="text-ink-soft"> ({reading})</span>
            )}{" "}
            — {meaning}
          </p>
          {word && <TokenLine tokens={word.example.tokens} className="text-lg" />}
        </Verdict>
      )}
    </CardShell>
  );
}

export function GrammarQuizCard({
  point,
  options,
  onAnswer,
}: {
  point: GrammarPoint;
  options: string[];
  onAnswer: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const { answer } = point.quiz;

  return (
    <CardShell tint="quiz" label="Quick check" meta="Fill in the blank">
      <p className="text-base text-ink-soft">{point.quiz.en}</p>
      <p lang="ja" className="font-display text-3xl leading-[2.1]">
        <TokenLine tokens={point.quiz.before} inline />
        <span
          className={`mx-1 inline-block min-w-16 rounded-lg border-b-2 px-2 text-center ${
            picked === null
              ? "border-accent bg-accent/10 text-transparent"
              : picked === answer
                ? "border-good bg-good/15"
                : "border-bad bg-bad/15"
          }`}
        >
          {picked === null ? "？" : answer}
        </span>
        <TokenLine tokens={point.quiz.after} inline />
      </p>

      <Options
        options={options}
        answer={answer}
        picked={picked}
        japanese
        onPick={(option) => {
          setPicked(option);
          onAnswer(option === answer);
        }}
      />

      {picked !== null && (
        <Verdict correct={picked === answer}>
          <p className="text-base">
            <span lang="ja" className="font-display">{point.pattern}</span> — {point.title}
          </p>
        </Verdict>
      )}
    </CardShell>
  );
}
