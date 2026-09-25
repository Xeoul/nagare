"use client";

import { useState } from "react";
import { lineText, type Fact, type GrammarPoint, type Story, type Word } from "@/lib/content";
import TokenLine from "../TokenLine";
import { useFeed } from "../FeedContext";
import { CardShell, ListenButton, Reveal, SaveButton } from "./Shared";

const POS_LABEL: Record<string, string> = {
  verb: "verb",
  "i-adj": "い-adjective",
  "na-adj": "な-adjective",
  noun: "noun",
  adverb: "adverb",
  pronoun: "pronoun",
  counter: "counter",
  expression: "expression",
};

export function WordCard({ word, onKnown }: { word: Word; onKnown: () => void }) {
  const { saved, toggleSave } = useFeed();
  const [known, setKnown] = useState(false);
  const example = lineText(word.example.tokens);

  return (
    <CardShell
      tint="word"
      label="New word"
      meta={`${word.level} · ${POS_LABEL[word.pos] ?? word.pos}`}
      rail={
        <>
          <SaveButton saved={saved.has(word.key)} onClick={() => toggleSave(word.key)} />
          <ListenButton text={`${word.key}。${example}`} />
        </>
      }
    >
      <span
        aria-hidden
        lang="ja"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden font-display text-[55vmin] leading-none text-ink opacity-[0.035] select-none"
      >
        {word.key[0]}
      </span>

      <div className="relative">
        <p lang="ja" className="text-lg text-ink-soft">{word.reading}</p>
        <h2 lang="ja" className="font-display text-6xl font-bold leading-tight tracking-tight sm:text-7xl">
          {word.key}
        </h2>
        <p className="mt-3 text-2xl">{word.meaning}</p>
      </div>

      <div className="relative mt-2 flex flex-col gap-1 border-t border-line/70 pt-5">
        <TokenLine tokens={word.example.tokens} className="text-2xl" />
        <Reveal text={word.example.en} />
      </div>

      <div className="relative">
        <button
          type="button"
          disabled={known}
          onClick={() => {
            setKnown(true);
            onKnown();
          }}
          className="rounded-full border border-line px-4 py-2 text-sm text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:border-transparent disabled:text-accent"
        >
          {known ? "Got it — I'll check back in a week" : "I already know this"}
        </button>
      </div>
    </CardShell>
  );
}

export function GrammarCard({ point }: { point: GrammarPoint }) {
  return (
    <CardShell
      tint="grammar"
      label="Grammar"
      meta={point.level}
      rail={<ListenButton text={point.examples.map((e) => lineText(e.tokens)).join("。")} />}
    >
      <div>
        <h2 lang="ja" className="font-display text-4xl font-bold leading-snug sm:text-5xl">
          {point.pattern}
        </h2>
        <p className="mt-1 text-xl text-accent-warm">{point.title}</p>
      </div>
      <p className="text-base leading-relaxed text-ink-soft">{point.explain}</p>
      <p lang="ja" className="self-start rounded-lg bg-ink/[0.06] px-3 py-1.5 font-display text-base">
        {point.form}
      </p>
      <div className="flex flex-col gap-4 border-t border-line/70 pt-4">
        {point.examples.map((example, i) => (
          <div key={i}>
            <TokenLine tokens={example.tokens} className="text-xl" />
            <Reveal text={example.en} className="text-sm" />
          </div>
        ))}
      </div>
    </CardShell>
  );
}

/**
 * One line of a short story, reel-by-reel. The segmented bar along the
 * top shows where you are in it, like a stories progress bar, and the
 * previous line stays faintly visible for context.
 */
export function StoryCard({ story, line }: { story: Story; line: number }) {
  const sentence = story.sentences[line];
  const previous = line > 0 ? story.sentences[line - 1] : null;
  const isLast = line === story.sentences.length - 1;

  return (
    <CardShell
      tint="story"
      label="Story"
      meta={
        <>
          <span lang="ja" className="font-display">{story.title}</span> · {story.en} · {line + 1}/
          {story.sentences.length}
        </>
      }
      rail={<ListenButton text={lineText(sentence.tokens)} />}
    >
      <div className="flex gap-1" aria-hidden>
        {story.sentences.map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i <= line ? "bg-accent" : "bg-ink/10"}`} />
        ))}
      </div>

      {previous && (
        <p lang="ja" className="font-display text-base leading-relaxed text-ink-soft/70">
          {lineText(previous.tokens)}
        </p>
      )}

      <TokenLine tokens={sentence.tokens} className="text-3xl sm:text-4xl" />
      <Reveal text={sentence.en} className="text-lg" />

      <p className="text-xs text-ink-soft">
        {isLast ? "The end. A new story starts soon." : "Tap any word for its meaning."}
      </p>
    </CardShell>
  );
}

export function FactCard({ fact }: { fact: Fact }) {
  return (
    <CardShell
      tint="fact"
      label="Did you know"
      rail={fact.example ? <ListenButton text={lineText(fact.example.tokens)} /> : undefined}
    >
      <h2 className="font-display text-3xl font-bold leading-snug">{fact.title}</h2>
      <p className="text-lg leading-relaxed text-ink-soft">{fact.body}</p>
      {fact.example && (
        <div className="rounded-2xl border border-line/70 bg-paper/60 px-4 py-3">
          <TokenLine tokens={fact.example.tokens} className="text-2xl" />
          <p className="text-sm text-ink-soft">{fact.example.en}</p>
        </div>
      )}
    </CardShell>
  );
}
