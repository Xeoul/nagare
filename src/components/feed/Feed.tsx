"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  FEED_LEVELS,
  buildBatch,
  cacheFeed,
  getCachedFeed,
  loadSentences,
  loadSourceText,
  type FeedLevel,
  type FeedSentence,
  type LoadedFeed,
} from "@/lib/feed";
import { loadDictionary, type JmdictLookup } from "@/lib/dictionary";
import { lookupKey } from "@/lib/tokenizer";
import { addItem, listItems, updateProgress } from "@/lib/library";
import {
  getFeedLevelPreference,
  getFuriganaPreference,
  setFeedLevelPreference,
  setFuriganaPreference,
  subscribeFeedLevel,
} from "@/lib/preferences";
import { onModelProgress, preloadTranslationModel, type ModelProgress } from "@/lib/translate";
import LookupSheet from "../LookupSheet";
import BottomNav from "../BottomNav";
import FeedCardView, { type WordSelection } from "./FeedCardView";

/** Cards within this distance of the visible one are mounted; the rest are empty snap slots. */
const RENDER_RADIUS = 2;
/** Start appending the next shuffled pass this close to the end. */
const PREFETCH_DISTANCE = 4;

export default function Feed() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  // null on the server and during hydration, so the first render is the
  // same loading screen everywhere; the stored level takes over after.
  const level = useSyncExternalStore(subscribeFeedLevel, getFeedLevelPreference, () => null);
  const [feed, setFeed] = useState<LoadedFeed | null>(getCachedFeed);
  const [current, setCurrent] = useState(() => getCachedFeed()?.index ?? 0);
  const [dictionary, setDictionary] = useState<JmdictLookup | null>(null);
  const [showFurigana, setShowFurigana] = useState(getFuriganaPreference);
  const [selected, setSelected] = useState<WordSelection | null>(null);
  const [modelProgress, setModelProgress] = useState<ModelProgress>(null);

  const ready = feed !== null && feed.level === level;
  const cards = ready ? feed.cards : [];
  const status = !ready ? "loading" : cards.length === 0 ? "empty" : "ready";

  useEffect(() => {
    preloadTranslationModel();
    void loadDictionary().then(setDictionary);
    return onModelProgress(setModelProgress);
  }, []);

  useEffect(() => {
    if (!level || feed?.level === level) return;
    let active = true;
    void loadSentences(level).then((sentences) => {
      if (!active) return;
      setFeed({ level, sentences, cards: sentences.length > 0 ? buildBatch(sentences) : [] });
    });
    return () => {
      active = false;
    };
  }, [level, feed?.level]);

  // Returning from a story: jump back to the card you left from.
  const restored = useRef(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (restored.current || !el || status !== "ready") return;
    restored.current = true;
    if (current > 0) el.scrollTo({ top: current * el.clientHeight });
  }, [status, current]);

  useEffect(() => {
    if (ready) cacheFeed({ ...feed, index: current });
  }, [ready, feed, current]);

  const scrollByCard = useCallback((direction: 1 | -1) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ top: direction * el.clientHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowDown" || event.key === "j") {
        event.preventDefault();
        scrollByCard(1);
      } else if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault();
        scrollByCard(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scrollByCard]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || !ready) return;
    const index = Math.round(el.scrollTop / el.clientHeight);
    if (index === current) return;
    setCurrent(index);
    setSelected(null);
    if (index >= feed.cards.length - PREFETCH_DISTANCE) {
      setFeed({ ...feed, cards: [...feed.cards, ...buildBatch(feed.sentences)] });
    }
  }

  function chooseLevel(next: FeedLevel) {
    scrollRef.current?.scrollTo({ top: 0, behavior: next === level ? "smooth" : "auto" });
    if (next === level) return;
    setCurrent(0);
    setSelected(null);
    setFeedLevelPreference(next);
  }

  function toggleFurigana() {
    setShowFurigana((prev) => {
      setFuriganaPreference(!prev);
      return !prev;
    });
  }

  async function openStory(sentence: FeedSentence) {
    const { source } = sentence;
    const existing = (await listItems()).find(
      (item) => item.kind === source.kind && item.title === source.title,
    );
    const item =
      existing ??
      (await addItem({ title: source.title, kind: source.kind, text: await loadSourceText(source) }));
    // Land roughly on the sentence you were looking at, not the top.
    await updateProgress(item.id, sentence.total > 1 ? sentence.index / (sentence.total - 1) : 0);
    router.push(`/read/${item.id}`);
  }

  const downloadPercent =
    modelProgress && modelProgress.total > 0
      ? Math.min(100, Math.round((modelProgress.loaded / modelProgress.total) * 100))
      : null;

  return (
    <div className="fixed inset-0 bg-black text-white">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((card, i) =>
          Math.abs(i - current) <= RENDER_RADIUS ? (
            <FeedCardView
              key={card.id}
              card={card}
              isFirst={i === 0 && current === 0}
              dictionary={dictionary}
              showFurigana={showFurigana}
              onToggleFurigana={toggleFurigana}
              onSelectWord={setSelected}
              onOpenStory={(sentence) => void openStory(sentence)}
              downloadPercent={downloadPercent}
            />
          ) : (
            <section key={card.id} className="h-dvh w-full snap-start snap-always" />
          ),
        )}
        {status !== "ready" && (
          <div className="flex h-dvh flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="font-display text-5xl text-white/80">流れ</p>
            <p className="text-sm text-white/50">
              {status === "loading" ? "Gathering sentences…" : "Nothing at this level yet."}
            </p>
          </div>
        )}
      </div>

      <header className="pointer-events-none fixed inset-x-0 top-0 z-20 bg-gradient-to-b from-black/60 via-black/20 to-transparent pb-10 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="relative mx-auto flex max-w-md items-center justify-center px-5">
          <span className="pointer-events-none absolute left-5 font-display text-lg font-bold text-white/90">
            流れ
          </span>
          <div className="pointer-events-auto flex items-center gap-5" role="tablist">
            {FEED_LEVELS.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={option === level}
                onClick={() => chooseLevel(option)}
                className={`relative py-1.5 text-sm font-semibold tracking-wide transition-colors ${
                  option === level ? "text-white" : "text-white/50 hover:text-white/75"
                }`}
              >
                {option}
                <span
                  className={`absolute inset-x-1 -bottom-0.5 h-0.5 rounded-full bg-white transition-opacity ${
                    option === level ? "opacity-100" : "opacity-0"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </header>

      <BottomNav variant="dark" />

      {selected && (
        <LookupSheet
          surfaceForm={selected.token.surface_form}
          lookupKey={lookupKey(selected.token)}
          entry={selected.entry}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
