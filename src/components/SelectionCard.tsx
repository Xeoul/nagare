"use client";

import { useEffect, useState } from "react";
import { findGrammar, type GrammarNote } from "@/lib/grammar";
import { getTokenizer } from "@/lib/tokenizer";
import { isSentenceSaved, toggleSavedSentence } from "@/lib/savedSentences";
import { speak } from "@/lib/speech";
import { onModelProgress, translateSentence, type ModelProgress } from "@/lib/translate";
import { GrammarNoteView } from "./LookupSheet";
import { HeartIcon, SpeakerIcon, XIcon } from "./icons";

type Props = {
  /** The highlighted Japanese, without furigana. */
  text: string;
  sourceTitle?: string;
  onClose: () => void;
};

/**
 * Shown when you highlight text in the reader: the English translation, a way
 * to listen to it or save it, and the grammar patterns it contains.
 */
export default function SelectionCard({ text, sourceTitle, onClose }: Props) {
  const [translation, setTranslation] = useState<{ text: string; result: string | null } | null>(null);
  const [notes, setNotes] = useState<{ text: string; notes: GrammarNote[] } | null>(null);
  const [saved, setSaved] = useState<{ text: string; saved: boolean } | null>(null);
  const [progress, setProgress] = useState<ModelProgress>(null);

  useEffect(() => onModelProgress(setProgress), []);

  useEffect(() => {
    let active = true;
    translateSentence(text)
      .then((result) => active && setTranslation({ text, result }))
      .catch(() => active && setTranslation({ text, result: null }));
    return () => {
      active = false;
    };
  }, [text]);

  useEffect(() => {
    let active = true;
    void getTokenizer().then((tokenizer) => {
      if (!active) return;
      const seen = new Set<string>();
      const found = findGrammar(tokenizer.tokenize(text))
        .map((match) => match.note)
        .filter((note) => !seen.has(note.id) && seen.add(note.id));
      setNotes({ text, notes: found });
    });
    return () => {
      active = false;
    };
  }, [text]);

  useEffect(() => {
    let active = true;
    void isSentenceSaved(text).then((isSaved) => active && setSaved({ text, saved: isSaved }));
    return () => {
      active = false;
    };
  }, [text]);

  const currentTranslation = translation?.text === text ? translation : null;
  const currentNotes = notes?.text === text ? notes.notes : null;
  const isSaved = saved?.text === text && saved.saved;
  const downloadPercent =
    !currentTranslation && progress && progress.total > 0
      ? Math.min(100, Math.round((progress.loaded / progress.total) * 100))
      : null;

  return (
    <div
      data-selection-card
      onMouseDown={(event) => event.preventDefault()}
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[26rem] lg:p-0 2xl:w-[30rem]"
    >
      <div className="max-h-[70vh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] bg-paper-raised/95 px-5 pb-5 pt-2.5 text-ink shadow-[0_-4px_40px_-8px_rgb(var(--shadow-color)/0.45)] ring-1 ring-line backdrop-blur-2xl lg:max-w-none">
        <div className="mx-auto h-1 w-9 rounded-full bg-line lg:hidden" />
        <div className="mt-3 flex items-start gap-3">
          <p className="min-w-0 flex-1 text-[1.05rem] font-semibold leading-snug">{text}</p>
          <button
            type="button"
            onClick={() => speak(text)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-sunk text-ink-soft transition-colors hover:text-ink"
            aria-label="Listen"
          >
            <SpeakerIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-pressed={isSaved}
            aria-label={isSaved ? "Sentence saved" : "Save sentence"}
            onClick={() => {
              void toggleSavedSentence({ text, sourceTitle: sourceTitle ?? "", level: "" }).then((next) =>
                setSaved({ text, saved: next }),
              );
            }}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
              isSaved ? "bg-ink text-paper" : "bg-paper-sunk text-ink-soft hover:text-ink"
            }`}
          >
            <HeartIcon className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-sunk text-ink-soft transition-colors hover:text-ink"
            aria-label="Close"
          >
            <XIcon className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        <p className="mt-3 border-l-2 border-line pl-3 text-[15px] leading-relaxed text-ink-soft">
          {currentTranslation
            ? (currentTranslation.result ?? "Translation unavailable")
            : downloadPercent !== null
              ? `Downloading the translation model (one-time, ~110MB)… ${downloadPercent}%`
              : "Translating…"}
        </p>

        {currentNotes && currentNotes.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft/80">Grammar in this sentence</p>
            <div className="mt-1.5 flex flex-col gap-2">
              {currentNotes.map((note) => (
                <GrammarNoteView key={note.id} note={note} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
