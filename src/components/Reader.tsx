"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { getTokenizer, isLookupable, lookupKey, type Token } from "@/lib/tokenizer";
import { loadDictionary, lookupDictionary, type JmdictEntry, type JmdictLookup } from "@/lib/dictionary";
import { isTranslatable, sentenceText, splitIntoSentences } from "@/lib/sentences";
import { onModelProgress, translateSentence, type ModelProgress } from "@/lib/translate";
import LookupSheet from "./LookupSheet";
import TokenText from "./TokenText";

type Props = {
  text: string;
  initialProgress: number;
  onProgressChange: (progress: number) => void;
  showFurigana: boolean;
  showTranslation: boolean;
  vertical: boolean;
};

type Selected = { index: number; token: Token; entry: JmdictEntry | null };

function Sentence({
  sentence,
  startIndex,
  showFurigana,
  showTranslation,
  vertical,
  dictionary,
  selectedIndex,
  onSelect,
  registerRef,
  onActivate,
  isActive,
}: {
  sentence: Token[];
  startIndex: number;
  showFurigana: boolean;
  showTranslation: boolean;
  vertical: boolean;
  dictionary: JmdictLookup | null;
  selectedIndex: number | null;
  onSelect: (selected: Selected) => void;
  registerRef: (startIndex: number, el: HTMLElement | null) => void;
  onActivate: (startIndex: number) => void;
  isActive: boolean;
}) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const ref = useRef<HTMLSpanElement>(null);
  const translatable = isTranslatable(sentence);

  // In vertical mode the translation is shown in a caption bar instead (see
  // TranslationCaption below) — inline "below the sentence" placement reads
  // as attached to whichever column happens to be adjacent, not its own
  // sentence, since a vertical-rl block flows into a new column rather than
  // sitting directly under the text. Still warm the cache here so the
  // caption doesn't have to wait once a sentence becomes active.
  useEffect(() => {
    if (!showTranslation || !translatable || status !== "idle") return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        setStatus("loading");
        translateSentence(sentenceText(sentence))
          .then((result) => {
            setTranslation(result);
            setStatus("done");
          })
          .catch((err) => {
            console.error("Sentence translation failed:", err);
            setStatus("error");
          });
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [showTranslation, translatable, status, sentence]);

  // Tapping a word already opens its dictionary entry (see the button below)
  // — this also marks the sentence you tapped as the one the translation
  // caption follows. Without it, a passage short enough to fit on screen
  // never scrolls, so the caption (which otherwise only updates from scroll
  // position) would stay stuck on whichever sentence happened to be centered
  // on load. Attached directly to every token (not just the outer span) —
  // in vertical mode this sentence's wrapper spans multiple columns like
  // wrapped lines, and Safari's click hit-testing on a multi-fragment inline
  // element can be unreliable, so each token gets its own handler rather
  // than relying on the tap bubbling up correctly from wherever it lands.
  const activate = vertical && showTranslation ? () => onActivate(startIndex) : undefined;

  return (
    <>
      <span
        ref={(el) => {
          ref.current = el;
          registerRef(startIndex, el);
          return () => registerRef(startIndex, null);
        }}
        data-start-index={startIndex}
        onClick={activate}
        // cursor: pointer is also the standard signal iOS Safari uses to treat
        // a non-form element as tappable; without it taps can silently no-op.
        className={
          vertical && showTranslation
            ? `cursor-pointer rounded transition-colors ${isActive ? "bg-accent/10" : ""}`
            : ""
        }
      >
        {sentence.map((token, i) => {
          const index = startIndex + i;
          return isLookupable(token) ? (
            <button
              key={index}
              type="button"
              onClick={() => {
                onSelect({
                  index,
                  token,
                  entry: lookupDictionary(lookupKey(token), token.surface_form, dictionary),
                });
                activate?.();
              }}
              className={`rounded px-0.5 transition-colors hover:bg-accent/10 focus-visible:bg-accent/10 ${
                selectedIndex === index
                  ? "bg-accent/25 underline decoration-accent decoration-2 underline-offset-4"
                  : ""
              }`}
            >
              <TokenText token={token} showFurigana={showFurigana} />
            </button>
          ) : (
            <span
              key={index}
              className={`whitespace-pre-wrap ${activate ? "cursor-pointer" : ""}`}
              onClick={activate}
            >
              {token.surface_form}
            </span>
          );
        })}
      </span>
      {showTranslation && translatable && !vertical && (
        <div className="mb-2 block text-sm text-ink-soft">
          {status === "error"
            ? "Translation unavailable"
            : status === "done"
              ? translation
              : "Translating…"}
        </div>
      )}
    </>
  );
}

/** A subtitle-style bar showing the translation for whichever sentence is currently centered in view. */
function TranslationCaption({ text }: { text: string | null }) {
  const [result, setResult] = useState<{ text: string; translation: string | null } | null>(null);

  useEffect(() => {
    if (!text) return;
    let active = true;
    translateSentence(text)
      .then((translation) => {
        if (active) setResult({ text, translation });
      })
      .catch(() => {
        if (active) setResult({ text, translation: null });
      });
    return () => {
      active = false;
    };
  }, [text]);

  if (!text) return null;

  const label = result?.text !== text ? "Translating…" : (result.translation ?? "Translation unavailable");

  return (
    <div className="absolute inset-x-0 bottom-0 max-h-[40%] overflow-y-auto rounded-b-2xl border-t border-line/70 bg-paper/95 px-4 py-2.5 text-sm text-ink-soft backdrop-blur-sm [writing-mode:horizontal-tb]">
      {label}
    </div>
  );
}

export default function Reader({
  text,
  initialProgress,
  onProgressChange,
  showFurigana,
  showTranslation,
  vertical,
}: Props) {
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [dictionary, setDictionary] = useState<JmdictLookup | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [modelProgress, setModelProgress] = useState<ModelProgress>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasRestoredScroll = useRef(false);
  const sentenceEls = useRef(new Map<number, HTMLElement>());

  const registerSentenceRef = useCallback((startIndex: number, el: HTMLElement | null) => {
    if (el) sentenceEls.current.set(startIndex, el);
    else sentenceEls.current.delete(startIndex);
  }, []);

  useEffect(() => onModelProgress(setModelProgress), []);

  useEffect(() => {
    let active = true;
    void getTokenizer().then((tokenizer) => {
      if (active) setTokens(tokenizer.tokenize(text));
    });
    return () => {
      active = false;
    };
  }, [text]);

  useEffect(() => {
    let active = true;
    // Independent of tokenizing so a slow dictionary fetch never delays
    // showing the text — clicks just fall back to "not found" until it's in.
    void loadDictionary().then((dict) => {
      if (active) setDictionary(dict);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!tokens || !el || hasRestoredScroll.current) return;
    hasRestoredScroll.current = true;
    if (vertical) {
      const max = el.scrollWidth - el.clientWidth;
      // vertical-rl starts at scrollLeft 0 and goes negative as you read
      // further in (toward the end, which sits further to the left).
      el.scrollLeft = -max * initialProgress;
    } else {
      el.scrollTop = (el.scrollHeight - el.clientHeight) * initialProgress;
    }
  }, [tokens, initialProgress, vertical]);

  // Switching orientation mid-read changes the scroll axis entirely —
  // rather than try to preserve the exact spot, just scroll back to the start.
  const previousVertical = useRef(vertical);
  useEffect(() => {
    if (previousVertical.current === vertical) return;
    previousVertical.current = vertical;
    const el = scrollRef.current;
    if (!el) return;
    if (vertical) el.scrollLeft = 0;
    else el.scrollTop = 0;
  }, [vertical]);

  const sentences = useMemo(() => {
    if (!tokens) return [];
    let offset = 0;
    return splitIntoSentences(tokens).map((sentence) => {
      const startIndex = offset;
      offset += sentence.length;
      return { sentence, startIndex };
    });
  }, [tokens]);

  // In vertical mode, track whichever sentence currently sits in a thin band
  // through the center of the reading pane — that's the one the caption bar
  // shows a translation for, like a scroll-spy.
  useEffect(() => {
    if (!vertical || !showTranslation) return;
    const root = scrollRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let best: { index: number; ratio: number } | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.startIndex);
          if (!best || entry.intersectionRatio > best.ratio) best = { index, ratio: entry.intersectionRatio };
        }
        if (best) setActiveIndex(best.index);
      },
      { root, rootMargin: "0px -45% 0px -45%", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const el of sentenceEls.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, [vertical, showTranslation, sentences]);

  // A "sentence N of total" counter — the closest equivalent to a page/line
  // number this continuously-scrolling reader has, since there are no real
  // page boundaries to count. Driven by scroll fraction (not the scroll-spy
  // above) so it starts at 1 and moves monotonically with how far you've
  // scrolled, rather than jumping to wherever a sentence geometrically sits.
  const [scrollFraction, setScrollFraction] = useState(initialProgress);
  const currentPosition =
    sentences.length > 0
      ? Math.min(sentences.length, Math.max(1, Math.round(scrollFraction * (sentences.length - 1)) + 1))
      : null;

  const activeSentenceText = useMemo(() => {
    if (!vertical || !showTranslation || activeIndex === null) return null;
    const active = sentences.find((s) => s.startIndex === activeIndex);
    return active && isTranslatable(active.sentence) ? sentenceText(active.sentence) : null;
  }, [vertical, showTranslation, activeIndex, sentences]);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    const fraction = vertical
      ? (() => {
          const max = el.scrollWidth - el.clientWidth;
          return max > 0 ? Math.abs(el.scrollLeft) / max : 1;
        })()
      : (() => {
          const max = el.scrollHeight - el.clientHeight;
          return max > 0 ? el.scrollTop / max : 1;
        })();
    onProgressChange(fraction);
    setScrollFraction(fraction);
  }

  if (!tokens) {
    return <p className="text-sm text-ink-soft">Reading through the text…</p>;
  }

  const downloadPercent =
    showTranslation && modelProgress && modelProgress.total > 0
      ? Math.min(100, Math.round((modelProgress.loaded / modelProgress.total) * 100))
      : null;

  return (
    <>
      {downloadPercent !== null && (
        <p className="mb-2 text-xs text-ink-soft">
          Downloading translation model (one-time, ~110MB)… {downloadPercent}%
        </p>
      )}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={`h-full w-full rounded-2xl border border-line/70 bg-paper-raised/60 p-6 text-xl shadow-sm [line-break:strict] [&_rt]:text-[0.5em] [&_rt]:font-normal [&_rt]:text-ink-soft ${
            showFurigana ? "leading-[2.6]" : "leading-loose"
          } ${
            vertical
              ? "overflow-x-auto overflow-y-hidden [writing-mode:vertical-rl]"
              : "overflow-y-auto overflow-x-hidden"
          } ${vertical && activeSentenceText ? "pb-14" : ""}`}
        >
          {sentences.map(({ sentence, startIndex }) => (
            <Sentence
              key={startIndex}
              sentence={sentence}
              startIndex={startIndex}
              showFurigana={showFurigana}
              showTranslation={showTranslation}
              vertical={vertical}
              dictionary={dictionary}
              selectedIndex={selected?.index ?? null}
              onSelect={setSelected}
              registerRef={registerSentenceRef}
              onActivate={setActiveIndex}
              isActive={activeIndex === startIndex}
            />
          ))}
        </div>
        {vertical && <TranslationCaption text={activeSentenceText} />}
        {currentPosition !== null && sentences.length > 0 && (
          <p
            aria-label={`Sentence ${currentPosition} of ${sentences.length}`}
            className="pointer-events-none absolute right-3 top-3 rounded-full border border-line/50 bg-paper/90 px-2.5 py-1 text-xs text-ink-soft shadow-sm backdrop-blur-sm"
          >
            {currentPosition} / {sentences.length}
          </p>
        )}
      </div>

      {selected && (
        <LookupSheet
          surfaceForm={selected.token.surface_form}
          lookupKey={lookupKey(selected.token)}
          entry={selected.entry}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
