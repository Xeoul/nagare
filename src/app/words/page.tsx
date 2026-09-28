"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { TrashIcon, XIcon } from "@/components/icons";
import { getStarred, toggleStarred, type StarredWord } from "@/lib/starred";
import {
  getSavedSentences,
  toggleSavedSentence,
  type SavedSentence,
} from "@/lib/savedSentences";
import { translateSentence } from "@/lib/translate";

function SavedSentenceCard({
  sentence,
  onRemove,
}: {
  sentence: SavedSentence;
  onRemove: () => void;
}) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  function reveal() {
    setRevealed(true);
    translateSentence(sentence.text)
      .then(setTranslation)
      .catch(() => setTranslation("Translation unavailable right now."));
  }

  return (
    <li className="card relative overflow-hidden py-4 pl-5 pr-4">
      <span aria-hidden="true" className="absolute inset-y-4 left-0 w-[3px] rounded-r-full bg-line" />
      <p className="text-lg leading-relaxed">{sentence.text}</p>
      {revealed ? (
        <p className="mt-1.5 text-sm leading-snug text-ink-soft">{translation ?? "Translating…"}</p>
      ) : (
        <button
          type="button"
          onClick={reveal}
          className="mt-2 rounded-full bg-paper-sunk px-3 py-1 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          Show translation
        </button>
      )}
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-ink-soft">
        <span className="truncate">
          <span className="font-semibold text-ink">{sentence.level}</span> · {sentence.sourceTitle}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft/70 transition-colors hover:bg-paper-sunk hover:text-accent-warm"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

export default function SavedPage() {
  const [sentences, setSentences] = useState<SavedSentence[] | null>(null);
  const [words, setWords] = useState<StarredWord[] | null>(null);
  const [tab, setTab] = useState<"sentences" | "words">("sentences");

  useEffect(() => {
    void getSavedSentences().then(setSentences);
    void getStarred().then(setWords);
  }, []);

  const tabs = [
    { id: "sentences" as const, label: "Sentences", count: sentences?.length ?? 0 },
    { id: "words" as const, label: "Words", count: words?.length ?? 0 },
  ];

  const activeIndex = tabs.findIndex((t) => t.id === tab);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 pb-32 pt-4 sm:pt-8">
      <PageHeader title="Saved" />

      <div className="relative grid grid-cols-2 rounded-full bg-paper-sunk p-1" role="tablist">
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-paper-thumb shadow-[0_2px_8px_-2px_rgb(var(--shadow-color)/0.2)] transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
        {tabs.map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`relative z-10 py-2 text-sm font-semibold transition-colors ${
              tab === id ? "text-ink" : "text-ink-soft"
            }`}
          >
            {label} <span className="ml-0.5 tabular-nums opacity-50">{count}</span>
          </button>
        ))}
      </div>

      {tab === "sentences" &&
        (sentences === null ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : sentences.length === 0 ? (
          <EmptyState
            glyph="文"
            text="Double-tap a card in the feed, or tap its heart, to keep a sentence here."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {sentences.map((sentence) => (
              <SavedSentenceCard
                key={sentence.text}
                sentence={sentence}
                onRemove={() => {
                  void toggleSavedSentence(sentence).then(() =>
                    setSentences((current) => current?.filter((s) => s.text !== sentence.text) ?? null),
                  );
                }}
              />
            ))}
          </ul>
        ))}

      {tab === "words" &&
        (words === null ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : words.length === 0 ? (
          <EmptyState
            glyph="語"
            text="Save a word spotlight in the feed, or tap any word while reading and add it."
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {words.map((word) => (
              <li key={word.key} className="card relative flex min-h-36 flex-col p-4">
                <p className="text-xs text-ink-soft">{word.reading !== word.key ? word.reading : "\u00a0"}</p>
                <p className="mt-0.5 break-all text-[1.75rem] font-bold leading-tight tracking-tight">
                  {word.key}
                </p>
                <p className="mt-auto line-clamp-2 pt-2 text-[13px] leading-snug text-ink-soft">
                  {word.meanings.slice(0, 2).join("; ")}
                </p>
                <button
                  type="button"
                  aria-label={`Remove ${word.key}`}
                  onClick={() => {
                    void toggleStarred(word).then(setWords);
                  }}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-ink-soft/60 transition-colors hover:bg-paper-sunk hover:text-accent-warm"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ))}

      <BottomNav />
    </div>
  );
}

function EmptyState({ glyph, text }: { glyph: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
      <span className="stamp h-14 w-14 text-2xl opacity-15">{glyph}</span>
      <p className="max-w-xs text-sm leading-relaxed text-ink-soft">{text}</p>
    </div>
  );
}
