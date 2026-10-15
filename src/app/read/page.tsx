"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
import BottomNav from "@/components/BottomNav";
import { ChevronLeftIcon, LanguagesIcon } from "@/components/icons";
import { splitChapters } from "@/lib/chapters";

// The item id comes in as ?id= rather than a /read/[id] path segment so the
// app can be exported as plain static files (the GitHub Pages demo): a
// static host has no page to serve for an id it never saw at build time.
// useSearchParams() has to sit under a Suspense boundary for that export.
export default function ReadPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-ink-soft">Loading…</p>}>
      <ReadView />
    </Suspense>
  );
}

function ReadView() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const [item, setItem] = useState<LibraryItem | null | undefined>(undefined);
  const [showFurigana, setShowFurigana] = useState(getFuriganaPreference);
  const [showTranslation, setShowTranslation] = useState(getTranslationPreference);
  const [vertical, setVertical] = useState(getVerticalPreference);
  const lastSaveRef = useRef(0);
  // null until you pick a chapter: the saved progress decides where to open.
  const [chosenChapter, setChosenChapter] = useState<number | null>(null);
  const chapters = useMemo(() => (item ? splitChapters(item.text) : []), [item]);

  useEffect(() => {
    if (!id) return;
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

  // Progress through the whole work: a book's chapter index plus how far
  // into that chapter, so "Continue reading" percentages stay meaningful.
  const chapterCount = Math.max(1, chapters.length);
  const savedPosition = (item?.progress ?? 0) * chapterCount;
  const chapterIndex = chosenChapter ?? Math.min(chapterCount - 1, Math.floor(savedPosition));
  const initialChapterProgress =
    chosenChapter === null ? Math.min(1, Math.max(0, savedPosition - chapterIndex)) : 0;

  function handleProgressChange(progress: number) {
    const now = Date.now();
    if (now - lastSaveRef.current < 1000) return;
    lastSaveRef.current = now;
    void updateProgress(id, (chapterIndex + progress) / chapterCount);
  }

  function goToChapter(index: number) {
    if (index < 0 || index >= chapterCount) return;
    setChosenChapter(index);
    lastSaveRef.current = Date.now();
    void updateProgress(id, index / chapterCount);
  }

  if (id && item === undefined) {
    return <p className="p-6 text-sm text-ink-soft">Loading…</p>;
  }

  if (!item) {
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
    <div className="lg:pl-60">
      <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:max-w-4xl lg:pb-6 lg:pt-6">
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
                  on ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
                }`}
              >
                {glyph}
              </button>
            ))}
          </div>
        </div>
        {chapters.length > 1 && (
          <div className="mb-3 flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Previous chapter"
              disabled={chapterIndex === 0}
              onClick={() => goToChapter(chapterIndex - 1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-raised text-ink-soft transition-colors hover:text-ink disabled:opacity-30"
            >
              <ChevronLeftIcon className="h-4 w-4" strokeWidth={2.2} />
            </button>
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Chapter</span>
              <select
                value={chapterIndex}
                onChange={(event) => goToChapter(Number(event.target.value))}
                className="h-9 w-full cursor-pointer appearance-none truncate rounded-full bg-paper-raised px-4 text-center text-[13px] font-semibold text-ink outline-none"
              >
                {chapters.map((chapter, i) => (
                  <option key={i} value={i}>
                    Chapter {i + 1} of {chapters.length}
                    {chapter.title ? ` · ${chapter.title}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              aria-label="Next chapter"
              disabled={chapterIndex === chapterCount - 1}
              onClick={() => goToChapter(chapterIndex + 1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-raised text-ink-soft transition-colors hover:text-ink disabled:opacity-30"
            >
              <ChevronLeftIcon className="h-4 w-4 rotate-180" strokeWidth={2.2} />
            </button>
          </div>
        )}
        <Reader
          key={chapterIndex}
          text={chapters[chapterIndex]?.text ?? item.text}
          endSlot={
            chapterIndex < chapterCount - 1 ? (
              <button
                type="button"
                onClick={() => goToChapter(chapterIndex + 1)}
                className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-transform active:scale-95"
              >
                Next chapter →
              </button>
            ) : undefined
          }
          initialProgress={initialChapterProgress}
          onProgressChange={handleProgressChange}
          showFurigana={showFurigana}
          showTranslation={showTranslation}
          vertical={vertical}
        />
      </div>
      <BottomNav mobile={false} />
    </div>
  );
}
