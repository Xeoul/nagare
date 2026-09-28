"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getItem, markOpened, updateProgress, type LibraryItem } from "@/lib/library";
import {
  getFuriganaPreference,
  setFuriganaPreference,
  getTranslationPreference,
  setTranslationPreference,
  getVerticalPreference,
  setVerticalPreference,
} from "@/lib/preferences";
import Reader from "@/components/Reader";
import { ChevronLeftIcon, LanguagesIcon } from "@/components/icons";

export default function ReadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<LibraryItem | null | undefined>(undefined);
  const [showFurigana, setShowFurigana] = useState(getFuriganaPreference);
  const [showTranslation, setShowTranslation] = useState(getTranslationPreference);
  const [vertical, setVertical] = useState(getVerticalPreference);
  const lastSaveRef = useRef(0);

  useEffect(() => {
    void getItem(id).then((found) => setItem(found ?? null));
    void markOpened(id);
  }, [id]);

  function toggleFurigana() {
    setShowFurigana((prev) => {
      const next = !prev;
      setFuriganaPreference(next);
      return next;
    });
  }

  function toggleTranslation() {
    setShowTranslation((prev) => {
      const next = !prev;
      setTranslationPreference(next);
      return next;
    });
  }

  function toggleVertical() {
    setVertical((prev) => {
      const next = !prev;
      setVerticalPreference(next);
      return next;
    });
  }

  function handleProgressChange(progress: number) {
    const now = Date.now();
    if (now - lastSaveRef.current < 1000) return;
    lastSaveRef.current = now;
    void updateProgress(id, progress);
  }

  if (item === undefined) {
    return <p className="p-6 text-sm text-ink-soft">Loading…</p>;
  }

  if (item === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p>Couldn&apos;t find that item.</p>
        <Link href="/library" className="text-sm text-accent hover:underline">
          Back to library
        </Link>
      </div>
    );
  }

  const toggles = [
    { label: "Furigana", on: showFurigana, toggle: toggleFurigana, glyph: <span className="text-[15px] font-bold">あ</span> },
    { label: "Translation", on: showTranslation, toggle: toggleTranslation, glyph: <LanguagesIcon className="h-[18px] w-[18px]" /> },
    { label: "Vertical text", on: vertical, toggle: toggleVertical, glyph: <span className="text-[15px] font-bold">縦</span> },
  ];

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
      <div className="flex shrink-0 items-center gap-2 pb-3">
        <button
          type="button"
          aria-label="Back"
          onClick={() => {
            // Stories open from both the feed and the library — go back to
            // whichever it was, falling back to the library on a direct visit.
            if (window.history.length > 1) router.back();
            else router.push("/library");
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper-raised shadow-[0_0_0_1px_rgb(var(--shadow-color)/0.06),0_4px_12px_-6px_rgb(var(--shadow-color)/0.3)] transition-transform active:scale-90"
        >
          <ChevronLeftIcon className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <h1 className="min-w-0 flex-1 truncate px-1 text-[15px] font-bold">{item.title}</h1>
        <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-paper-raised p-1 shadow-[0_0_0_1px_rgb(var(--shadow-color)/0.06),0_4px_12px_-6px_rgb(var(--shadow-color)/0.3)]">
          {toggles.map(({ label, on, toggle, glyph }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              aria-pressed={on}
              title={label}
              onClick={toggle}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                on ? "bg-accent text-white" : "text-ink-soft hover:text-ink"
              }`}
            >
              {glyph}
            </button>
          ))}
        </div>
      </div>
      <Reader
        text={item.text}
        initialProgress={item.progress}
        onProgressChange={handleProgressChange}
        showFurigana={showFurigana}
        showTranslation={showTranslation}
        vertical={vertical}
      />
    </div>
  );
}
