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
  getReaderPrefs,
  setReaderPrefs,
  FONT_SCALES,
  SPACING_FACTORS,
  type ReaderPrefs,
} from "@/lib/preferences";
import ReaderSettings from "@/components/ReaderSettings";
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
  const trailingSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Unset until you pick a chapter: the saved progress decides where to
  // open. Tied to the item id so a choice never carries over to another book.
  const [chapterChoice, setChapterChoice] = useState<{ id: string; index: number } | null>(null);
  const chosenChapter = chapterChoice?.id === id ? chapterChoice.index : null;
  // The latest position, saved at most once a second while scrolling and
  // once more on the way out so the last second of reading isn't lost.
  const pendingProgress = useRef<number | null>(null);
  const chapters = useMemo(() => (item ? splitChapters(item.text) : []), [item]);
  const [prefs, setPrefs] = useState<ReaderPrefs>(getReaderPrefs);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // In page mode the controls float over the page and get out of the way
  // once you start reading; a tap in the middle of the page brings them back.
  const [chromeVisible, setChromeVisible] = useState(false);
  // Where to reopen after switching between pages and scrolling, which
  // remounts the reader: the position within the current chapter.
  const liveFraction = useRef<number | null>(null);
  const [resumeAt, setResumeAt] = useState<{ id: string; chapter: number; fraction: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    void getItem(id).then((found) => setItem(found ?? null));
    void markOpened(id);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const flush = () => {
      if (trailingSave.current) clearTimeout(trailingSave.current);
      trailingSave.current = null;
      if (pendingProgress.current === null) return;
      void updateProgress(id, pendingProgress.current);
      pendingProgress.current = null;
    };
    // pagehide covers closing the tab or app; the cleanup covers navigating away.
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
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
    liveFraction.current = progress;
    pendingProgress.current = (chapterIndex + progress) / chapterCount;
    const save = () => {
      trailingSave.current = null;
      if (pendingProgress.current === null) return;
      lastSaveRef.current = Date.now();
      void updateProgress(id, pendingProgress.current);
      pendingProgress.current = null;
    };
    const wait = 1000 - (Date.now() - lastSaveRef.current);
    if (wait <= 0) save();
    // A quick run of page turns still lands within a second, rather than
    // relying on the save as the page closes (which a phone can cut short).
    else trailingSave.current ??= setTimeout(save, wait);
  }

  function updatePrefs(next: ReaderPrefs) {
    if (next.paged !== prefs.paged) {
      setResumeAt({ id, chapter: chapterIndex, fraction: liveFraction.current ?? initialChapterProgress });
    }
    setPrefs(next);
    setReaderPrefs(next);
  }

  function goToChapter(index: number) {
    if (index < 0 || index >= chapterCount) return;
    liveFraction.current = null;
    setResumeAt(null);
    setChapterChoice({ id, index });
    lastSaveRef.current = Date.now();
    pendingProgress.current = null;
    if (trailingSave.current) clearTimeout(trailingSave.current);
    trailingSave.current = null;
    void updateProgress(id, index / chapterCount);
  }

  if (id && item === undefined) {
    return <p className="p-6 text-sm text-ink-soft">Loading…</p>;
  }

  if (!item) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p>Couldn&apos;t find that item.</p>
        <Link href="/" className="text-sm text-accent hover:underline">
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

  const themeAttr = prefs.theme === "auto" ? undefined : prefs.theme;
  const controls = (
    <>
      <div className="flex shrink-0 items-center gap-2 pb-3">
        <button
          type="button"
          aria-label="Back"
          onClick={() => {
            // Go back to wherever the book was opened from (the library or
            // your saved words), falling back to the library on a direct visit.
            if (window.history.length > 1) router.back();
            else router.push("/");
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
        <button
          type="button"
          aria-label="Reading settings"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((open) => !open)}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold shadow-[0_0_0_1px_rgb(var(--shadow-color)/0.06),0_4px_12px_-6px_rgb(var(--shadow-color)/0.3)] transition-colors ${
            settingsOpen ? "bg-ink text-paper" : "bg-paper-raised"
          }`}
        >
          Aa
        </button>
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
      {settingsOpen && (
        <div className="mb-3">
          <ReaderSettings prefs={prefs} onChange={updatePrefs} />
        </div>
      )}
    </>
  );

  return (
    <div className="lg:pl-60">
      <div data-reader-theme={themeAttr} className="relative h-dvh bg-paper text-ink">
        <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:max-w-4xl lg:pb-6 lg:pt-6">
          {prefs.paged ? (
            <>
              {/* The toolbar floats over this gap, so the first line of text
                  starts below it instead of being covered when it's showing.
                  The heights match the toolbar's rows: the controls (h-10 +
                  pb-3) and, with several chapters, the chapter picker (h-9 +
                  mb-3). While the toolbar is hidden, the gap holds a faint
                  running title, like an e-reader's header line; the toolbar
                  covers it when it comes back. */}
              <div
                className={`flex shrink-0 items-end justify-center ${chapters.length > 1 ? "h-[6.25rem]" : "h-[3.25rem]"}`}
              >
                <p aria-hidden className="max-w-full truncate px-4 pb-1 text-center text-[11px] text-ink-soft/70">
                  {item.title}
                  {chapters.length > 1 && chapters[chapterIndex]?.title
                    ? ` · ${chapters[chapterIndex].title}`
                    : ""}
                </p>
              </div>
              <div
                className={`absolute inset-x-0 top-0 z-20 mx-auto w-full max-w-2xl bg-paper/95 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[0_8px_24px_-16px_rgb(var(--shadow-color)/0.4)] transition-all duration-200 sm:px-6 lg:max-w-4xl lg:pt-6 ${
                  // iOS keeps blurring what's behind an element that's only
                  // faded out, so the hidden toolbar is also made invisible and
                  // loses its blur, or it smears the title line above the text.
                  chromeVisible
                    ? "translate-y-0 opacity-100 backdrop-blur-md"
                    : "pointer-events-none invisible -translate-y-3 opacity-0"
                }`}
              >
                {controls}
              </div>
            </>
          ) : (
            controls
          )}
          <Reader
            key={`${chapterIndex}-${prefs.paged ? "pages" : "scroll"}`}
            text={chapters[chapterIndex]?.text ?? item.text}
            sourceTitle={item.title}
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
            initialProgress={
              resumeAt && resumeAt.id === id && resumeAt.chapter === chapterIndex
                ? resumeAt.fraction
                : initialChapterProgress
            }
            onProgressChange={handleProgressChange}
            showFurigana={showFurigana}
            showTranslation={showTranslation}
            vertical={vertical}
            paged={prefs.paged}
            fontScale={FONT_SCALES[prefs.fontStep] ?? 1}
            spacingFactor={SPACING_FACTORS[prefs.spacing]}
            onCenterTap={() => {
              setSettingsOpen(false);
              setChromeVisible((visible) => !visible);
            }}
            onPageTurn={() => {
              setSettingsOpen(false);
              setChromeVisible(false);
            }}
          />
        </div>
      </div>
      <BottomNav mobile={false} />
    </div>
  );
}
