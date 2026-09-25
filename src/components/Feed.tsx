"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadContent, type Content } from "@/lib/content";
import { createPlanner, type Card, type Planner } from "@/lib/feed";
import {
  emptyProgress,
  introduce,
  loadProgress,
  markKnown,
  recordAnswer,
  saveProgress,
  stats,
  toggleSaved,
  type Progress,
} from "@/lib/progress";
import { FeedContext, type FeedContextValue } from "./FeedContext";
import { FactCard, GrammarCard, StoryCard, WordCard } from "./cards/LessonCards";
import { GrammarQuizCard, WordQuizCard } from "./cards/QuizCards";
import { GlossSheet, SettingsSheet } from "./Sheets";

/** Cards planned ahead of the one on screen, so the next swipe is instant. */
const LOOKAHEAD = 3;

export default function Feed() {
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgressState] = useState<Progress | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [glossKey, setGlossKey] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [atTop, setAtTop] = useState(true);

  // The planner reads progress through this ref, so it always sees the
  // latest state without being rebuilt on every change.
  const progressRef = useRef<Progress>(emptyProgress());
  const plannerRef = useRef<Planner | null>(null);
  const seenRef = useRef(new Set<number>());
  const scrollerRef = useRef<HTMLDivElement>(null);

  const update = useCallback((change: (p: Progress) => Progress) => {
    setProgressState((current) => (current ? change(current) : current));
  }, []);

  useEffect(() => {
    if (!progress) return;
    progressRef.current = progress;
    saveProgress(progress);
  }, [progress]);

  const start = useCallback((loaded: Content, saved: Progress) => {
    progressRef.current = saved;
    setProgressState(saved);
    seenRef.current = new Set();
    const planner = createPlanner(loaded, () => progressRef.current);
    plannerRef.current = planner;
    setCards(Array.from({ length: LOOKAHEAD + 1 }, () => planner.next()));
    scrollerRef.current?.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([loadContent(), loadProgress()])
      .then(([loaded, saved]) => {
        if (!active) return;
        setContent(loaded);
        start(loaded, saved);
      })
      .catch((err: Error) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [start]);

  /** A card has been scrolled into view: record it, and plan further ahead if needed. */
  const handleSeen = useCallback(
    (index: number, card: Card) => {
      const planner = plannerRef.current;
      if (!planner) return;

      if (!seenRef.current.has(card.id)) {
        seenRef.current.add(card.id);
        switch (card.kind) {
          case "word":
            update((p) => introduce(p, `w:${card.word.key}`));
            break;
          case "grammar":
            update((p) => introduce(p, `g:${card.point.id}`));
            break;
          case "story":
            update((p) => ({ ...p, cursor: { ...p.cursor, story: card.storyIndex, line: card.line + 1 } }));
            break;
          case "fact":
            update((p) => ({ ...p, cursor: { ...p.cursor, fact: card.index + 1 } }));
            break;
          default:
            planner.settle(card.itemId);
        }
      }

      setCards((current) => {
        const needed = index + 1 + LOOKAHEAD - current.length;
        if (needed <= 0) return current;
        return [...current, ...Array.from({ length: needed }, () => planner.next())];
      });
    },
    [update],
  );

  // Watch which card is on screen.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || cards.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (cards[index]) handleSeen(index, cards[index]);
        }
      },
      { root: scroller, threshold: 0.6 },
    );
    for (const el of scroller.querySelectorAll("[data-index]")) observer.observe(el);
    return () => observer.disconnect();
  }, [cards, handleSeen]);

  // Keyboard: ↓/j/space for next, ↑/k for previous.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (glossKey || settingsOpen) return;
      const scroller = scrollerRef.current;
      if (!scroller) return;
      if (e.key === "ArrowDown" || e.key === "j" || e.key === " ") {
        e.preventDefault();
        scroller.scrollBy({ top: scroller.clientHeight, behavior: "smooth" });
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        scroller.scrollBy({ top: -scroller.clientHeight, behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [glossKey, settingsOpen]);

  const saved = useMemo(() => new Set(progress?.saved ?? []), [progress?.saved]);

  const contextValue = useMemo<FeedContextValue | null>(
    () =>
      content && progress
        ? {
            content,
            furigana: progress.furigana,
            saved,
            openGloss: setGlossKey,
            toggleSave: (key) => update((p) => toggleSaved(p, key)),
          }
        : null,
    [content, progress, saved, update],
  );

  if (error) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-ink-soft">{error}</p>
        <button type="button" onClick={() => window.location.reload()} className="text-accent underline">
          Try again
        </button>
      </div>
    );
  }

  if (!contextValue || !progress) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <p lang="ja" className="animate-pulse font-display text-4xl text-ink-soft">流れ</p>
      </div>
    );
  }

  const { learning, learned, due } = stats(progress);

  return (
    <FeedContext.Provider value={contextValue}>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-paper via-paper/80 to-transparent pb-6">
        <div className="pointer-events-auto mx-auto flex max-w-xl items-center justify-between gap-3 px-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <p className="font-display text-xl font-bold">
            <span lang="ja">流れ</span> <span className="text-sm font-medium text-ink-soft">Nagare</span>
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/words"
              className="rounded-full border border-line/80 bg-paper/80 px-3 py-1.5 text-xs text-ink-soft backdrop-blur transition-colors hover:border-accent hover:text-accent"
            >
              {learned} learned · {learning} learning{due > 0 ? ` · ${due} due` : ""}
            </Link>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line/80 bg-paper/80 text-ink-soft backdrop-blur hover:text-accent"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
                <circle cx="16" cy="6" r="2" />
                <circle cx="10" cy="12" r="2" />
                <circle cx="18" cy="18" r="2" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div
        ref={scrollerRef}
        onScroll={(e) => setAtTop(e.currentTarget.scrollTop < 40)}
        className="feed-scroller h-[100dvh] snap-y snap-mandatory overflow-y-scroll overscroll-contain"
      >
        {cards.map((card, index) => (
          <div key={card.id} data-index={index}>
            {renderCard(card, update)}
          </div>
        ))}
      </div>

      {atTop && (
        <p className="pointer-events-none fixed inset-x-0 bottom-5 z-20 animate-bounce text-center text-xs text-ink-soft">
          Swipe up ↑
        </p>
      )}

      {glossKey && <GlossSheet glossKey={glossKey} onClose={() => setGlossKey(null)} />}
      {settingsOpen && (
        <SettingsSheet
          level={progress.level}
          furigana={progress.furigana}
          onLevel={(level) => update((p) => ({ ...p, level }))}
          onFurigana={(furigana) => update((p) => ({ ...p, furigana }))}
          onReset={() => {
            const fresh = emptyProgress();
            saveProgress(fresh);
            setSettingsOpen(false);
            start(content!, fresh);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </FeedContext.Provider>
  );
}

function renderCard(card: Card, update: (change: (p: Progress) => Progress) => void) {
  switch (card.kind) {
    case "word":
      return <WordCard word={card.word} onKnown={() => update((p) => markKnown(p, `w:${card.word.key}`))} />;
    case "grammar":
      return <GrammarCard point={card.point} />;
    case "story":
      return <StoryCard story={card.story} line={card.line} />;
    case "fact":
      return <FactCard fact={card.fact} />;
    case "quiz-word":
      return (
        <WordQuizCard
          wordKey={card.key}
          mode={card.mode}
          prompt={card.prompt}
          options={card.options}
          answer={card.answer}
          onAnswer={(correct) => update((p) => recordAnswer(p, card.itemId, correct))}
        />
      );
    case "quiz-grammar":
      return (
        <GrammarQuizCard
          point={card.point}
          options={card.options}
          onAnswer={(correct) => update((p) => recordAnswer(p, card.itemId, correct))}
        />
      );
  }
}
