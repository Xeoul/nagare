"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
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
    <li className="card px-4 py-3">
      <p className="font-display text-lg leading-relaxed">{sentence.text}</p>
      {revealed ? (
        <p className="mt-1 text-sm text-ink-soft">{translation ?? "Translating…"}</p>
      ) : (
        <button
          type="button"
          onClick={reveal}
          className="mt-1 text-xs text-accent transition-colors hover:text-accent-soft"
        >
          Show translation
        </button>
      )}
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-ink-soft">
        <span>
          {sentence.sourceTitle} · {sentence.level}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="transition-colors hover:text-accent-warm"
        >
          Remove
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 pb-28 sm:p-8 sm:pb-28">
      <header className="border-b border-line/70 pb-6">
        <p className="font-display text-sm tracking-wide text-ink-soft">流れ — &quot;flow&quot;</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Saved</h1>
      </header>

      <div className="flex gap-2" role="tablist">
        {tabs.map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all active:scale-95 ${
              tab === id
                ? "border-accent bg-accent text-paper shadow-sm"
                : "border-line text-ink-soft hover:border-accent hover:text-accent"
            }`}
          >
            {label} <span className="opacity-70">{count}</span>
          </button>
        ))}
      </div>

      {tab === "sentences" &&
        (sentences === null ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : sentences.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Nothing saved yet — double-tap a card in the feed (or tap the heart) to save it here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
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
          <p className="text-sm text-ink-soft">
            No words yet — save a word spotlight in the feed, or tap any word and add it.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {words.map((word) => (
              <li key={word.key} className="card flex items-start gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg">{word.key}</p>
                  <p className="text-sm text-ink-soft">
                    {word.reading} · {word.meanings.join("; ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void toggleStarred(word).then(setWords);
                  }}
                  className="shrink-0 text-xs text-ink-soft transition-colors hover:text-accent-warm"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ))}

      <BottomNav />
    </div>
  );
}
