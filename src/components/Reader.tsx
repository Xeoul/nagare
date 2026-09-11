"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { getTokenizer, isLookupable, lookupKey, type Token } from "@/lib/tokenizer";
import { loadDictionary, lookupDictionary, type JmdictEntry, type JmdictLookup } from "@/lib/dictionary";
import { getFurigana } from "@/lib/furigana";
import { isTranslatable, sentenceText, splitIntoSentences } from "@/lib/sentences";
import { onModelProgress, translateSentence, type ModelProgress } from "@/lib/translate";
import LookupSheet from "./LookupSheet";

type Props = {
  text: string;
  initialProgress: number;
  onProgressChange: (progress: number) => void;
  showFurigana: boolean;
  showTranslation: boolean;
  vertical: boolean;
};

function TokenText({ token, showFurigana }: { token: Token; showFurigana: boolean }) {
  const furigana = showFurigana ? getFurigana(token) : null;
  if (!furigana) return token.surface_form;

  return (
    <>
      {furigana.before}
      <ruby>
        {furigana.kanji}
        <rt>{furigana.reading}</rt>
      </ruby>
      {furigana.after}
    </>
  );
}

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

  return (
    <>
      <span
        ref={(el) => {
          ref.current = el;
          registerRef(startIndex, el);
          return () => registerRef(startIndex, null);
        }}
        data-start-index={startIndex}
      >
        {sentence.map((token, i) => {
          const index = startIndex + i;
          return isLookupable(token) ? (
            <button
              key={index}
              type="button"
              onClick={() =>
                onSelect({
                  index,
                  token,
                  entry: lookupDictionary(lookupKey(token), token.surface_form, dictionary),
                })
              }
              className={`rounded px-0.5 transition-colors hover:bg-accent/10 focus-visible:bg-accent/10 ${
                selectedIndex === index
                  ? "bg-accent/25 underline decoration-accent decoration-2 underline-offset-4"
                  : ""
              }`}
            >
              <TokenText token={token} showFurigana={showFurigana} />
            </button>
          ) : (
            <span key={index} className="whitespace-pre-wrap">
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
    <div className="absolute inset-x-0 bottom-0 border-t border-line bg-paper px-4 py-2 text-sm text-ink-soft [writing-mode:horizontal-tb]">
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

  const activeSentenceText = useMemo(() => {
    if (!vertical || !showTranslation || activeIndex === null) return null;
    const active = sentences.find((s) => s.startIndex === activeIndex);
    return active && isTranslatable(active.sentence) ? sentenceText(active.sentence) : null;
  }, [vertical, showTranslation, activeIndex, sentences]);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    if (vertical) {
      const max = el.scrollWidth - el.clientWidth;
      onProgressChange(max > 0 ? Math.abs(el.scrollLeft) / max : 1);
    } else {
      const max = el.scrollHeight - el.clientHeight;
      onProgressChange(max > 0 ? el.scrollTop / max : 1);
    }
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
      <div className="relative h-[calc(100vh-160px)]">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={`h-full w-full rounded border border-line bg-paper-raised/60 p-6 text-xl [line-break:strict] [&_rt]:text-[0.5em] [&_rt]:font-normal [&_rt]:text-ink-soft ${
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
            />
          ))}
        </div>
        {vertical && <TranslationCaption text={activeSentenceText} />}
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
