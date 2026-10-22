"use client";

import { useEffect, useState } from "react";
import type { JmdictEntry } from "@/lib/dictionary";
import type { GrammarNote } from "@/lib/grammar";
import { isSentenceSaved, toggleSavedSentence } from "@/lib/savedSentences";
import { isStarred, toggleStarred } from "@/lib/starred";
import { speak } from "@/lib/speech";
import { BookmarkIcon, HeartIcon, SpeakerIcon, XIcon } from "./icons";

type Props = {
  surfaceForm: string;
  lookupKey: string;
  entry: JmdictEntry | null;
  /** How the word is read where it appears (kuromoji's katakana reading), for read-aloud. */
  reading?: string;
  /** The sentence the word sits in, offered as a second thing to listen to. */
  sentence?: string;
  /** Where the sentence is from, kept with it when it's saved. */
  sourceTitle?: string;
  /** Grammar patterns this word is part of, explained under the meanings. */
  grammar?: GrammarNote[];
  onClose: () => void;
};

/** One grammar pattern: its name, level, what it means and an example. */
export function GrammarNoteView({ note }: { note: GrammarNote }) {
  return (
    <div className="rounded-2xl bg-paper-sunk px-3.5 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[15px] font-bold">{note.title}</span>
        <span className="rounded-full bg-paper-raised px-2 py-0.5 text-[10px] font-bold text-ink-soft">{note.level}</span>
      </div>
      <p className="mt-1 text-[13.5px] leading-snug text-ink-soft">{note.meaning}</p>
      <p className="mt-1.5 text-[13.5px] leading-snug">
        {note.example.ja}
        <span className="block text-ink-soft">{note.example.en}</span>
      </p>
    </div>
  );
}

export default function LookupSheet({
  surfaceForm,
  lookupKey,
  entry,
  reading,
  sentence,
  sourceTitle,
  grammar,
  onClose,
}: Props) {
  const [starred, setStarred] = useState(false);
  const [sentenceSaved, setSentenceSaved] = useState(false);

  useEffect(() => {
    void isStarred(lookupKey).then(setStarred);
  }, [lookupKey]);

  useEffect(() => {
    if (sentence) void isSentenceSaved(sentence).then(setSentenceSaved);
  }, [sentence]);

  const meanings = entry?.meanings.slice(0, 4) ?? [];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[24rem] lg:p-0">
      <div className="max-h-[75vh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] bg-paper-raised/95 px-5 pb-5 pt-2.5 text-ink shadow-[0_-4px_40px_-8px_rgb(var(--shadow-color)/0.45)] ring-1 ring-line backdrop-blur-2xl">
        <div className="mx-auto h-1 w-9 rounded-full bg-line lg:hidden" />
        <div className="mt-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {entry && entry.reading !== surfaceForm && (
              <p className="text-sm text-ink-soft">{entry.reading}</p>
            )}
            <p className="text-[2rem] font-bold leading-tight tracking-tight">{surfaceForm}</p>
          </div>
          <button
            type="button"
            onClick={() => speak(reading || surfaceForm)}
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-sunk text-ink-soft transition-colors hover:text-ink"
            aria-label="Listen"
          >
            <SpeakerIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-sunk text-ink-soft transition-colors hover:text-ink"
            aria-label="Close"
          >
            <XIcon className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        {entry ? (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {entry.level && (
                <span className="rounded-full bg-paper-sunk px-2 py-0.5 text-[11px] font-bold text-ink">
                  {entry.level}
                </span>
              )}
              <span className="truncate rounded-full bg-paper-sunk px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                {entry.pos.split(",")[0]}
              </span>
              {lookupKey !== surfaceForm && (
                <span className="rounded-full bg-paper-sunk px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                  from {lookupKey}
                </span>
              )}
              {sentence && (
                <button
                  type="button"
                  onClick={() => speak(sentence)}
                  className="flex items-center gap-1 rounded-full bg-paper-sunk px-2 py-0.5 text-[11px] font-medium text-ink-soft transition-colors hover:text-ink"
                >
                  <SpeakerIcon className="h-3 w-3" />
                  Sentence
                </button>
              )}
              {sentence && (
                <button
                  type="button"
                  aria-pressed={sentenceSaved}
                  onClick={() => {
                    void toggleSavedSentence({ text: sentence, sourceTitle: sourceTitle ?? "", level: "" }).then(
                      setSentenceSaved,
                    );
                  }}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    sentenceSaved ? "bg-ink text-paper" : "bg-paper-sunk text-ink-soft hover:text-ink"
                  }`}
                >
                  <HeartIcon className="h-3 w-3" fill={sentenceSaved ? "currentColor" : "none"} />
                  {sentenceSaved ? "Sentence saved" : "Save sentence"}
                </button>
              )}
            </div>
            <ol className="mt-3 flex flex-col gap-1">
              {meanings.map((meaning, i) => (
                <li key={meaning} className="flex gap-2.5 text-[15px] leading-snug">
                  <span className="w-3 shrink-0 text-right text-xs font-semibold leading-[1.45rem] text-ink-soft/70">
                    {i + 1}
                  </span>
                  <span>{meaning}</span>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => {
                void toggleStarred({
                  key: lookupKey,
                  reading: entry.reading,
                  meanings: entry.meanings,
                }).then((next) => setStarred(next.some((word) => word.key === lookupKey)));
              }}
              className={`mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold transition-all active:scale-[0.98] ${
                starred ? "bg-paper-sunk text-ink-soft" : "bg-ink text-paper"
              }`}
            >
              <BookmarkIcon className="h-[18px] w-[18px]" fill={starred ? "currentColor" : "none"} />
              {starred ? "Saved to your words" : "Save word"}
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">Not in the dictionary.</p>
        )}

        {grammar && grammar.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft/80">Grammar</p>
            <div className="mt-1.5 flex flex-col gap-2">
              {grammar.map((note) => (
                <GrammarNoteView key={note.id} note={note} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
