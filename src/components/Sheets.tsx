"use client";

import { useEffect, type ReactNode } from "react";
import type { Level } from "@/lib/content";
import { canSpeak, speak } from "@/lib/speech";
import { useFeed } from "./FeedContext";
import { BookmarkIcon, SpeakerIcon } from "./cards/Shared";

function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" />
      <div className="sheet-in relative w-full max-w-xl rounded-t-3xl border-t border-line/70 bg-paper px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_-12px_rgb(var(--shadow-color)/0.35)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" aria-hidden />
        {children}
      </div>
    </div>
  );
}

/** What you see after tapping a word in any sentence. */
export function GlossSheet({ glossKey, onClose }: { glossKey: string; onClose: () => void }) {
  const { content, saved, toggleSave } = useFeed();
  const word = content.words.find((w) => w.key === glossKey);
  const gloss = content.glossary[glossKey];
  const reading = word?.reading ?? gloss?.r;
  const meaning = word?.meaning ?? gloss?.m;
  const pos = word?.pos ?? gloss?.p;
  const level = word?.level ?? gloss?.l;
  const isSaved = saved.has(glossKey);
  // Particles and endings aren't vocabulary to drill.
  const saveable = pos !== "particle" && pos !== "ending";

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {reading && reading !== glossKey && <p lang="ja" className="text-sm text-ink-soft">{reading}</p>}
          <p lang="ja" className="font-display text-4xl font-bold">{glossKey}</p>
          <p className="mt-2 text-lg">{meaning ?? "Not in the dictionary"}</p>
          <p className="mt-1 text-xs text-ink-soft">
            {[pos, level].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 gap-2 pt-1">
          {canSpeak() && (
            <button
              type="button"
              onClick={() => speak(glossKey)}
              aria-label="Listen"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line"
            >
              <SpeakerIcon />
            </button>
          )}
          {saveable && meaning && (
            <button
              type="button"
              onClick={() => toggleSave(glossKey)}
              aria-label={isSaved ? "Unsave" : "Save"}
              aria-pressed={isSaved}
              className={`flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
                isSaved ? "border-accent bg-accent text-paper" : "border-line"
              }`}
            >
              <BookmarkIcon filled={isSaved} />
              {isSaved ? "Saved" : "Save"}
            </button>
          )}
        </div>
      </div>
      {saveable && meaning && !isSaved && (
        <p className="mt-4 text-xs text-ink-soft">Saved words show up as quick checks in your feed.</p>
      )}
    </Sheet>
  );
}

export function SettingsSheet({
  level,
  furigana,
  onLevel,
  onFurigana,
  onReset,
  onClose,
}: {
  level: Level;
  furigana: boolean;
  onLevel: (level: Level) => void;
  onFurigana: (on: boolean) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet onClose={onClose}>
      <h2 className="mb-5 text-sm font-medium tracking-[0.12em] text-ink-soft uppercase">Settings</h2>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Focus level</p>
            <p className="text-sm text-ink-soft">New words and grammar from this level come first.</p>
          </div>
          <div className="flex shrink-0 rounded-full border border-line p-1">
            {(["N5", "N4"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onLevel(l)}
                aria-pressed={level === l}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  level === l ? "bg-accent text-paper" : "text-ink-soft"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-4">
          <div>
            <p className="font-medium">Furigana</p>
            <p className="text-sm text-ink-soft">Readings above kanji.</p>
          </div>
          <input
            type="checkbox"
            checked={furigana}
            onChange={(e) => onFurigana(e.target.checked)}
            className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-line transition-colors before:block before:h-5 before:w-5 before:translate-x-0.5 before:rounded-full before:bg-paper before:shadow before:transition-transform checked:bg-accent checked:before:translate-x-[1.375rem]"
          />
        </label>

        <button
          type="button"
          onClick={() => {
            if (window.confirm("Reset all progress and saved words? This can't be undone.")) onReset();
          }}
          className="self-start text-sm text-bad underline-offset-4 hover:underline"
        >
          Reset progress
        </button>
      </div>
    </Sheet>
  );
}
