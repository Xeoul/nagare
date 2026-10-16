"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type UIEvent,
  type WheelEvent,
} from "react";
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
  /** Shown after the last sentence in place of the "おわり · END" marker (e.g. a next-chapter button). */
  endSlot?: ReactNode;
  /** Turn pages like an e-reader instead of scrolling. */
  paged?: boolean;
  /** Text size multiplier (1 = default). */
  fontScale?: number;
  /** Line-height multiplier from the reader's spacing setting (1 = default). */
  spacingFactor?: number;
  /** A tap in the middle of a page (not on a word) — shows or hides the reader's controls. */
  onCenterTap?: () => void;
  /** Called whenever a page is turned. */
  onPageTurn?: () => void;
};

/** Space between pages in paged mode (only ever seen mid-turn, never on screen). */
const PAGE_GAP = 48;
/** A learner's reading pace, in characters a minute, for "min left in chapter". */
const CHARS_PER_MINUTE = 250;

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
            ? `cursor-pointer rounded transition-colors ${isActive ? "bg-ink/5" : ""}`
            : ""
        }
      >
        {sentence.map((token, i) => {
          const index = startIndex + i;
          return isLookupable(token) ? (
            // A truly inline span rather than a <button>: buttons are
            // inline-block, which puts gaps between words and lets a line
            // break land before the 。 that follows one.
            <span
              key={index}
              role="button"
              tabIndex={0}
              onClick={() => {
                onSelect({
                  index,
                  token,
                  entry: lookupDictionary(lookupKey(token), token.surface_form, dictionary, token),
                });
                activate?.();
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onSelect({
                  index,
                  token,
                  entry: lookupDictionary(lookupKey(token), token.surface_form, dictionary, token),
                });
              }}
              className={`cursor-pointer rounded transition-colors hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-none ${
                selectedIndex === index
                  ? "bg-ink/[0.07] underline decoration-ink-soft/60 decoration-1 underline-offset-4"
                  : ""
              }`}
            >
              <TokenText token={token} showFurigana={showFurigana} />
            </span>
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
        <div className="mb-3 mt-0.5 block border-l-2 border-line pl-3 text-[15px] leading-relaxed text-ink-soft">
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
    <div className="absolute inset-x-0 bottom-0 max-h-[40%] overflow-y-auto rounded-b-[1.75rem] border-t border-line bg-paper-raised/95 px-5 py-3 pb-10 text-sm text-ink-soft backdrop-blur-md [writing-mode:horizontal-tb]">
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
  endSlot,
  paged = false,
  fontScale = 1,
  spacingFactor = 1,
  onCenterTap,
  onPageTurn,
}: Props) {
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [dictionary, setDictionary] = useState<JmdictLookup | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [modelProgress, setModelProgress] = useState<ModelProgress>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
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
    if (paged || !tokens || !el || hasRestoredScroll.current) return;
    hasRestoredScroll.current = true;
    if (vertical) {
      const max = el.scrollWidth - el.clientWidth;
      // vertical-rl starts at scrollLeft 0 and goes negative as you read
      // further in (toward the end, which sits further to the left).
      el.scrollLeft = -max * initialProgress;
    } else {
      el.scrollTop = (el.scrollHeight - el.clientHeight) * initialProgress;
    }
  }, [paged, tokens, initialProgress, vertical]);

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
  // The counter only means something when there's somewhere to scroll to; a
  // story that fits on one screen would otherwise sit at "1 of N" forever,
  // which reads like a page number with a next page you can't reach.
  const [scrollable, setScrollable] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setScrollable(
        vertical ? el.scrollWidth > el.clientWidth + 4 : el.scrollHeight > el.clientHeight + 4,
      );
    });
    observer.observe(el);
    for (const child of el.children) observer.observe(child);
    return () => observer.disconnect();
  }, [vertical, sentences, showFurigana, showTranslation]);
  const currentPosition =
    sentences.length > 0
      ? Math.min(sentences.length, Math.max(1, Math.round(scrollFraction * (sentences.length - 1)) + 1))
      : null;

  // ── Paged mode ──────────────────────────────────────────────────────────
  // Horizontal text is laid out in CSS columns exactly one page wide
  // (column-width: 100vw always rounds down to one column per page), and a
  // page turn scrolls by one column. Vertical text already flows sideways,
  // so its pages are a whole number of lines wide — a page never cuts a
  // line in half — and a turn scrolls by that much.
  const lineHeight = (showFurigana ? 2.6 : 2) * spacingFactor;
  const [pageState, setPageState] = useState({ page: 0, pages: 1, step: 0 });
  const fractionRef = useRef(initialProgress);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    const frame = frameRef.current;
    if (!paged || !el || !frame) return;
    let step: number;
    let pages: number;
    if (vertical) {
      const style = getComputedStyle(frame);
      const available = frame.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const pitch = parseFloat(getComputedStyle(el).lineHeight) || 40;
      step = Math.max(1, Math.floor(available / pitch)) * pitch;
      pages = Math.max(1, Math.ceil((el.scrollWidth - 1) / step));
    } else {
      step = el.clientWidth + PAGE_GAP;
      pages = Math.max(1, Math.round((el.scrollWidth + PAGE_GAP) / step));
    }
    const page = Math.min(pages - 1, Math.round(fractionRef.current * (pages - 1)));
    setPageState((prev) =>
      prev.page === page && prev.pages === pages && prev.step === step ? prev : { page, pages, step },
    );
  }, [paged, vertical]);

  // Re-measure whenever the layout can change: a resize, new settings, or
  // content arriving (translations load in after the text).
  useEffect(() => {
    if (!paged) return;
    const el = scrollRef.current;
    const frame = frameRef.current;
    if (!el || !frame) return;
    let raf = requestAnimationFrame(measure);
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(frame);
    const mutations = new MutationObserver(schedule);
    mutations.observe(el, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      mutations.disconnect();
    };
  }, [paged, measure, sentences, showFurigana, showTranslation, fontScale, spacingFactor]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!paged || !el) return;
    const offset = pageState.page * pageState.step;
    el.scrollLeft = vertical ? -offset : offset;
  }, [paged, vertical, pageState]);

  const pageStateRef = useRef(pageState);
  useEffect(() => {
    pageStateRef.current = pageState;
  }, [pageState]);

  const turn = useCallback(
    (delta: number) => {
      const prev = pageStateRef.current;
      const page = Math.min(prev.pages - 1, Math.max(0, prev.page + delta));
      if (page === prev.page) return;
      fractionRef.current = prev.pages > 1 ? page / (prev.pages - 1) : 1;
      const next = { ...prev, page };
      pageStateRef.current = next;
      setPageState(next);
      onProgressChange(fractionRef.current);
      onPageTurn?.();
    },
    [onProgressChange, onPageTurn],
  );

  // Arrow keys / Page Up / Page Down / Space. In vertical text the book reads
  // right to left, so the left arrow goes forward.
  useEffect(() => {
    if (!paged) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      const forward = ["PageDown", " ", vertical ? "ArrowLeft" : "ArrowRight", "ArrowDown"];
      const back = ["PageUp", vertical ? "ArrowRight" : "ArrowLeft", "ArrowUp"];
      if (forward.includes(event.key)) turn(1);
      else if (back.includes(event.key)) turn(-1);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paged, vertical, turn]);

  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const lastWheel = useRef(0);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    pointerStart.current = { x: event.clientX, y: event.clientY };
    swiped.current = false;
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    swiped.current = true;
    // Swipe left for the next page — or right, in a right-to-left vertical book.
    turn((dx < 0) !== vertical ? 1 : -1);
  }

  function handlePageClick(event: MouseEvent<HTMLDivElement>) {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest("[role=button], button, a, select, input")) return;
    if (selected) {
      setSelected(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    if (x < 0.3) turn(vertical ? 1 : -1);
    else if (x > 0.7) turn(vertical ? -1 : 1);
    else onCenterTap?.();
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    const now = Date.now();
    if (Math.abs(event.deltaY) < 20 || now - lastWheel.current < 350) return;
    lastWheel.current = now;
    turn(event.deltaY > 0 ? 1 : -1);
  }

  const fontScaleVar = { "--fs": fontScale } as CSSProperties;
  const pageFraction = pageState.pages > 1 ? pageState.page / (pageState.pages - 1) : 1;
  const minutesLeft = Math.ceil((text.length * (1 - pageFraction)) / CHARS_PER_MINUTE);

  // The sentence holding the tapped word, so the lookup sheet can read it aloud.
  const selectedSentence = useMemo(() => {
    if (!selected) return null;
    const match = sentences.find(
      ({ sentence, startIndex }) =>
        selected.index >= startIndex && selected.index < startIndex + sentence.length,
    );
    return match ? sentenceText(match.sentence) : null;
  }, [selected, sentences]);

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
    return <p className="px-2 text-sm text-ink-soft">Reading through the text…</p>;
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
      {paged ? (
        <div
          ref={frameRef}
          onClick={handlePageClick}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          className="relative min-h-0 flex-1 px-7 pb-12 pt-4 lg:px-16 lg:pb-14 lg:pt-8"
        >
          <div
            ref={scrollRef}
            style={{
              ...fontScaleVar,
              lineHeight,
              ...(vertical
                ? { width: pageState.step || undefined }
                : { columnWidth: "100vw", columnGap: PAGE_GAP, columnFill: "auto" }),
            }}
            className={`h-full overflow-hidden text-[calc(1.3rem*var(--fs))] [line-break:strict] lg:text-[calc(1.5rem*var(--fs))] [&_rt]:text-[0.5em] [&_rt]:font-normal [&_rt]:text-ink-soft ${
              vertical ? "mx-auto [writing-mode:vertical-rl]" : "w-full"
            }`}
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
            {sentences.length > 0 && endSlot && (
              <div className="mt-10 flex justify-center [writing-mode:horizontal-tb]">{endSlot}</div>
            )}
            {sentences.length > 0 && !endSlot && (
              <p className="mt-10 text-center text-xs tracking-[0.2em] text-ink-soft/70 [writing-mode:horizontal-tb]">
                おわり · END
              </p>
            )}
          </div>
          {vertical && <TranslationCaption text={activeSentenceText} />}
          <div className="pointer-events-none absolute inset-x-7 bottom-4 flex justify-between text-[11px] tabular-nums text-ink-soft/80 lg:inset-x-16">
            <span>
              Page {pageState.page + 1} of {pageState.pages}
            </span>
            <span>
              {pageState.page >= pageState.pages - 1
                ? "End of chapter"
                : minutesLeft <= 1
                  ? "Under a minute left"
                  : `${minutesLeft} min left in chapter`}
            </span>
          </div>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{ ...fontScaleVar, lineHeight }}
            className={`h-full w-full rounded-[1.75rem] bg-paper-raised px-6 py-7 text-[calc(1.3rem*var(--fs))] lg:px-14 lg:py-12 lg:text-[calc(1.5rem*var(--fs))] shadow-[0_0_0_1px_rgb(var(--shadow-color)/0.05),0_12px_32px_-16px_rgb(var(--shadow-color)/0.25)] [line-break:strict] [&_rt]:text-[0.5em] [&_rt]:font-normal [&_rt]:text-ink-soft ${
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
            {sentences.length > 0 && endSlot && (
              <div className="mt-10 flex justify-center [writing-mode:horizontal-tb]">{endSlot}</div>
            )}
            {sentences.length > 0 && !endSlot && (
              <p className="mt-10 text-center text-xs tracking-[0.2em] text-ink-soft/70 [writing-mode:horizontal-tb]">
                おわり · END
              </p>
            )}
          </div>
          {vertical && <TranslationCaption text={activeSentenceText} />}
          {scrollable && currentPosition !== null && sentences.length > 0 && (
            <p
              aria-label={`Sentence ${currentPosition} of ${sentences.length}`}
              className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-paper-sunk/90 px-3 py-1 text-[11px] font-medium tabular-nums text-ink-soft backdrop-blur-md [writing-mode:horizontal-tb]"
            >
              Sentence {currentPosition} of {sentences.length}
            </p>
          )}
        </div>

      )}

      {selected && (
        <LookupSheet
          surfaceForm={selected.token.surface_form}
          lookupKey={lookupKey(selected.token)}
          entry={selected.entry}
          reading={selected.token.reading}
          sentence={selectedSentence ?? undefined}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
