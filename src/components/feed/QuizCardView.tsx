"use client";

import { useEffect, useMemo, useState } from "react";
import { getTokenizer, type Token } from "@/lib/tokenizer";
import { lookupDictionary, type JmdictLookup } from "@/lib/dictionary";
import { buildQuiz, pickSpotlight } from "@/lib/spotlight";
import { getStarred, isStarred, toggleStarred, type StarredWord } from "@/lib/starred";
import { speak } from "@/lib/speech";
import { auraStyle, hashText } from "@/lib/cover";
import type { FeedCard } from "@/lib/feed";
import { BookmarkIcon, CheckIcon, SpeakerIcon, XIcon } from "../icons";

type Target = {
  key: string;
  reading: string;
  meanings: string[];
  pos: string;
  level?: string;
  /** The sentence the word came from, with the word's position — absent for a saved-word quiz. */
  context?: { tokens: Token[]; index: number };
};

/**
 * A multiple-choice card: "what does this word mean?" Half the time (once
 * you have some) it quizzes one of your saved words; otherwise a word from
 * a sentence in the feed, shown in that sentence.
 */
export default function QuizCardView({
  card,
  dictionary,
}: {
  card: Extract<FeedCard, { kind: "quiz" }>;
  dictionary: JmdictLookup | null;
}) {
  const seed = hashText(card.id);
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [starred, setStarredWords] = useState<StarredWord[] | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void getTokenizer().then((tokenizer) => {
      if (active) setTokens(tokenizer.tokenize(card.sentence.text));
    });
    void getStarred().then((words) => {
      if (active) setStarredWords(words);
    });
    return () => {
      active = false;
    };
  }, [card.sentence.text]);

  const target = useMemo((): Target | null => {
    if (!dictionary || !tokens || !starred) return null;
    if (starred.length > 0 && seed % 2 === 0) {
      const word = starred[seed % starred.length];
      const entry = lookupDictionary(word.key, word.key, dictionary);
      return {
        key: word.key,
        reading: word.reading,
        meanings: word.meanings,
        pos: entry?.pos ?? "noun",
        level: entry?.level,
      };
    }
    const spot = pickSpotlight(tokens, dictionary, seed);
    if (!spot) return null;
    return {
      key: spot.key,
      reading: spot.entry.reading,
      meanings: spot.entry.meanings,
      pos: spot.entry.pos,
      level: spot.entry.level,
      context: { tokens, index: spot.index },
    };
  }, [dictionary, tokens, starred, seed]);

  const quiz = useMemo(
    () =>
      target && dictionary
        ? buildQuiz(
            { key: target.key, entry: { meanings: target.meanings, pos: target.pos, level: target.level } },
            dictionary,
            seed,
          )
        : null,
    [target, dictionary, seed],
  );

  useEffect(() => {
    if (!target) return;
    let active = true;
    void isStarred(target.key).then((value) => {
      if (active) setSaved(value);
    });
    return () => {
      active = false;
    };
  }, [target]);

  const answered = chosen !== null;
  const correct = answered && quiz !== null && chosen === quiz.answer;

  return (
    <section
      style={auraStyle(card.sentence.text)}
      className="relative h-dvh w-full snap-start snap-always select-none overflow-hidden text-white"
    >
      <div className="absolute inset-0 flex flex-col justify-center px-6 pb-36 pt-24">
        {!target || !quiz ? (
          <p className="text-sm text-white/50">
            {tokens && dictionary ? "Skip ahead — no quiz here." : "Setting up a quiz…"}
          </p>
        ) : (
          <>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-white/55">
              <span className="h-1 w-1 rounded-full bg-white/50" />
              {target.context ? "Quick quiz" : "From your saved words"}
            </p>

            <p className="mt-5 min-h-7 text-lg text-white/55">
              {answered && target.reading !== target.key ? target.reading : ""}
            </p>
            <h2 className="text-[3.25rem] font-semibold leading-none tracking-[-0.02em]">{target.key}</h2>
            <p className="mt-3 text-[15px] text-white/60">What does this mean?</p>

            {target.context && (
              <p className="mt-4 text-base leading-relaxed text-white/50 [line-break:strict]">
                {target.context.tokens.map((token, i) => (
                  <span
                    key={i}
                    className={i === target.context?.index ? "text-white underline decoration-white/50 underline-offset-[5px]" : ""}
                  >
                    {token.surface_form}
                  </span>
                ))}
              </p>
            )}

            <div className="mt-7 flex flex-col gap-2.5">
              {quiz.options.map((option, i) => {
                const isAnswer = i === quiz.answer;
                const isChosen = i === chosen;
                const state = !answered
                  ? "bg-white/[0.06] ring-white/10 active:bg-white/15"
                  : isAnswer
                    ? "bg-white/[0.16] ring-white/40"
                    : isChosen
                      ? "bg-white/[0.04] ring-white/10 opacity-60"
                      : "bg-white/[0.03] ring-white/5 opacity-40";
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={answered}
                    onClick={() => {
                      setChosen(i);
                      speak(target.reading || target.key);
                    }}
                    className={`flex min-h-[3.25rem] items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-medium ring-1 backdrop-blur-xl transition-all ${state}`}
                  >
                    <span className="min-w-0 flex-1">{option}</span>
                    {answered && isAnswer && <CheckIcon className="h-[18px] w-[18px] shrink-0" strokeWidth={2.4} />}
                    {answered && isChosen && !isAnswer && <XIcon className="h-[18px] w-[18px] shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className={`mt-5 flex min-h-9 items-center gap-2 transition-opacity ${answered ? "opacity-100" : "opacity-0"}`}>
              <p className="min-w-0 flex-1 text-sm text-white/70">
                {correct ? "Correct." : answered ? "Not quite — the answer is highlighted." : ""}
              </p>
              {answered && (
                <>
                  <button
                    type="button"
                    aria-label="Listen"
                    onClick={() => speak(target.reading || target.key)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] ring-1 ring-white/10"
                  >
                    <SpeakerIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void toggleStarred({ key: target.key, reading: target.reading, meanings: target.meanings }).then(
                        (next) => setSaved(next.some((w) => w.key === target.key)),
                      );
                    }}
                    className="flex h-9 items-center gap-1.5 rounded-full bg-white/[0.08] px-3.5 text-[13px] font-semibold ring-1 ring-white/10"
                  >
                    <BookmarkIcon className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
                    {saved ? "Saved" : "Save word"}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {target?.context && (
        <div className="absolute bottom-[calc(6rem+env(safe-area-inset-bottom))] left-5 right-5">
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white/85">
              {card.sentence.source.level}
            </span>
            <p className="min-w-0 truncate text-[13px] font-semibold text-white/70">{card.sentence.source.title}</p>
          </div>
        </div>
      )}
    </section>
  );
}
