"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { getTokenizer, isLookupable, lookupKey, type Token } from "@/lib/tokenizer";
import { lookupDictionary, type JmdictEntry, type JmdictLookup } from "@/lib/dictionary";
import { hasKanji } from "@/lib/furigana";
import { translateSentence } from "@/lib/translate";
import { isStarred, toggleStarred } from "@/lib/starred";
import { isSentenceSaved, toggleSavedSentence } from "@/lib/savedSentences";
import type { FeedCard, FeedSentence } from "@/lib/feed";
import TokenText from "../TokenText";
import { auraStyle, coverGlyph, hashText as hash } from "@/lib/cover";
import { BookOpenIcon, HeartIcon, LanguagesIcon } from "../icons";

export type WordSelection = { token: Token; entry: JmdictEntry | null };

type Props = {
  card: FeedCard;
  isFirst: boolean;
  dictionary: JmdictLookup | null;
  showFurigana: boolean;
  onToggleFurigana: () => void;
  onSelectWord: (selection: WordSelection) => void;
  onOpenStory: (sentence: FeedSentence) => void;
  downloadPercent: number | null;
};

const CONTENT_POS = new Set(["名詞", "動詞", "形容詞", "副詞"]);
const SKIP_POS_DETAIL = new Set(["非自立", "数", "代名詞", "接尾"]);
const TOO_COMMON = new Set(["する", "ある", "いる", "なる", "いう", "できる", "くる", "来る", "こと", "もの", "よう", "とき"]);

/** The word a spotlight card features: a content word the dictionary knows, preferring ones with kanji. */
function pickSpotlight(tokens: Token[], dictionary: JmdictLookup | null, seed: number) {
  const candidates = tokens
    .map((token, index) => ({ token, index, key: lookupKey(token) }))
    .filter(
      (c) =>
        CONTENT_POS.has(c.token.pos) &&
        !SKIP_POS_DETAIL.has(c.token.pos_detail_1) &&
        !TOO_COMMON.has(c.key),
    )
    .map((c) => ({ ...c, entry: lookupDictionary(c.key, c.token.surface_form, dictionary, c.token) }))
    .filter((c): c is typeof c & { entry: JmdictEntry } => Boolean(c.entry?.meanings.length));
  if (candidates.length === 0) return null;
  const withKanji = candidates.filter((c) => hasKanji(c.key));
  const pool = withKanji.length > 0 ? withKanji : candidates;
  return pool[seed % pool.length];
}

function SentenceTokens({
  text,
  tokens,
  showFurigana,
  highlightIndex,
  onWord,
}: {
  text: string;
  tokens: Token[] | null;
  showFurigana: boolean;
  highlightIndex?: number;
  onWord: (token: Token) => void;
}) {
  if (!tokens) return <>{text}</>;
  return (
    <>
      {tokens.map((token, i) =>
        isLookupable(token) ? (
          // A truly inline span rather than a <button>: buttons are
          // inline-block, which lets a line break land between a word and
          // the 。 or 」 after it, breaking Japanese line-breaking rules.
          <span
            key={i}
            role="button"
            tabIndex={0}
            onClick={(event) => {
              // Word taps shouldn't count toward a double-tap save.
              event.stopPropagation();
              onWord(token);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onWord(token);
              }
            }}
            className={`cursor-pointer rounded-md transition-colors active:bg-white/15 ${
              i === highlightIndex ? "text-[#ff7a5c]" : ""
            }`}
          >
            <TokenText token={token} showFurigana={showFurigana} />
          </span>
        ) : (
          <span key={i}>{token.surface_form}</span>
        ),
      )}
    </>
  );
}

function RailButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="flex flex-col items-center gap-1.5 text-white transition-transform active:scale-90"
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full ring-1 backdrop-blur-xl transition-colors ${
          active ? "bg-white/20 ring-white/25" : "bg-white/[0.08] ring-white/10"
        }`}
      >
        {children}
      </span>
      <span className="text-[10px] font-semibold tracking-wide text-white/75">{label}</span>
    </button>
  );
}

export default function FeedCardView({
  card,
  isFirst,
  dictionary,
  showFurigana,
  onToggleFurigana,
  onSelectWord,
  onOpenStory,
  downloadPercent,
}: Props) {
  const { sentence } = card;
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [burst, setBurst] = useState<{ x: number; y: number; key: number } | null>(null);
  const lastTap = useRef(0);

  useEffect(() => {
    let active = true;
    void getTokenizer().then((tokenizer) => {
      if (active) setTokens(tokenizer.tokenize(sentence.text));
    });
    return () => {
      active = false;
    };
  }, [sentence.text]);

  const spotlight = useMemo(
    () => (card.kind === "word" && tokens ? pickSpotlight(tokens, dictionary, hash(card.id)) : null),
    [card.kind, card.id, tokens, dictionary],
  );
  // spotlight is only ever non-null on a word card; one whose sentence has no
  // dictionary-known content word just shows as a normal sentence card.
  const spotlightPending = card.kind === "word" && (!tokens || !dictionary);

  useEffect(() => {
    let active = true;
    const check = spotlight ? isStarred(spotlight.key) : isSentenceSaved(sentence.text);
    void check.then((value) => {
      if (active) setSaved(value);
    });
    return () => {
      active = false;
    };
  }, [spotlight, sentence.text]);

  useEffect(() => {
    if (!revealed || translation !== null) return;
    let active = true;
    translateSentence(sentence.text)
      .then((result) => {
        if (active) setTranslation(result);
      })
      .catch(() => {
        if (active) setTranslation("Translation unavailable right now.");
      });
    return () => {
      active = false;
    };
  }, [revealed, translation, sentence.text]);

  async function save(force: boolean) {
    if (spotlight) {
      if (force && saved) return;
      const next = await toggleStarred({
        key: spotlight.key,
        reading: spotlight.entry.reading,
        meanings: spotlight.entry.meanings,
      });
      setSaved(next.some((w) => w.key === spotlight.key));
    } else {
      setSaved(
        await toggleSavedSentence(
          { text: sentence.text, sourceTitle: sentence.source.title, level: sentence.source.level },
          force,
        ),
      );
    }
  }

  function handleTap(event: MouseEvent<HTMLElement>) {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      const rect = event.currentTarget.getBoundingClientRect();
      setBurst({ x: event.clientX - rect.left, y: event.clientY - rect.top, key: now });
      void save(true);
    } else {
      lastTap.current = now;
    }
  }

  function selectWord(token: Token) {
    onSelectWord({
      token,
      entry: lookupDictionary(lookupKey(token), token.surface_form, dictionary, token),
    });
  }

  const watermark = coverGlyph(sentence.text);
  const rubyStyle =
    "[line-break:strict] [&_rt]:text-[0.42em] [&_rt]:font-normal [&_rt]:text-white/55";

  const translationBlock = revealed ? (
    <p className="mt-6 max-w-md border-l-2 border-[#ff5a3c] pl-3.5 text-[15px] leading-relaxed text-white/80">
      {translation ??
        (downloadPercent !== null
          ? `Downloading translation model… ${downloadPercent}%`
          : "Translating…")}
    </p>
  ) : (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setRevealed(true);
      }}
      className="mt-7 flex items-center gap-2 self-start rounded-full bg-white/[0.08] px-4 py-2 text-[13px] font-semibold text-white/85 ring-1 ring-white/10 backdrop-blur-xl transition-colors active:bg-white/20"
    >
      <LanguagesIcon className="h-4 w-4" />
      Show translation
    </button>
  );

  const progress = sentence.total > 1 ? (sentence.index + 1) / sentence.total : 1;

  return (
    <section
      onClick={handleTap}
      style={auraStyle(sentence.text)}
      className="relative h-dvh w-full cursor-pointer snap-start snap-always select-none overflow-hidden text-white [touch-action:manipulation]"
    >
      <span
        aria-hidden="true"
        className="glyph-watermark pointer-events-none absolute -right-[18vw] top-[45%] -translate-y-1/2 text-[80vw] font-bold leading-none sm:text-[45vh]"
      >
        {watermark}
      </span>

      <div className="absolute inset-0 flex flex-col justify-center px-6 pb-44 pr-20 pt-24">
        {spotlight ? (
          <>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-white/55">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff5a3c]" />
              Word spotlight
            </p>
            <p className="mt-5 min-h-7 text-lg text-white/55">
              {spotlight.entry.reading !== spotlight.key ? spotlight.entry.reading : ""}
            </p>
            <h2 className="text-[4rem] font-bold leading-none tracking-[-0.02em]">{spotlight.key}</h2>
            <p className="mt-4 text-lg font-medium leading-snug text-white/90">
              {spotlight.entry.meanings.slice(0, 3).join("; ")}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {spotlight.entry.level && (
                <span className="rounded-full bg-[#ff5a3c] px-2 py-0.5 text-[10px] font-bold">
                  {spotlight.entry.level}
                </span>
              )}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
                {spotlight.entry.pos.split(",")[0]}
              </span>
            </div>
            <div className="mt-7 rounded-3xl bg-white/[0.06] p-4 ring-1 ring-white/10 backdrop-blur-xl">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                In context
              </p>
              <p className={`text-xl leading-[2.3] ${rubyStyle}`}>
                <SentenceTokens
                  text={sentence.text}
                  tokens={tokens}
                  showFurigana={showFurigana}
                  highlightIndex={spotlight.index}
                  onWord={selectWord}
                />
              </p>
            </div>
            {translationBlock}
          </>
        ) : spotlightPending ? (
          <p className="text-sm text-white/50">Finding a word…</p>
        ) : (
          <>
            <p
              className={`text-[1.75rem] font-semibold leading-[2.25] tracking-[0.01em] sm:text-4xl sm:leading-[2.2] ${rubyStyle}`}
            >
              <SentenceTokens
                text={sentence.text}
                tokens={tokens}
                showFurigana={showFurigana}
                onWord={selectWord}
              />
            </p>
            {translationBlock}
          </>
        )}
      </div>

      <div className="absolute bottom-[calc(6rem+env(safe-area-inset-bottom))] right-3 flex flex-col items-center gap-4">
        <RailButton label={saved ? "Saved" : "Save"} active={saved} onClick={() => void save(false)}>
          <HeartIcon
            className={`h-6 w-6 transition-colors ${saved ? "text-[#ff5a3c]" : ""}`}
            fill={saved ? "currentColor" : "none"}
          />
        </RailButton>
        <RailButton label="Translate" active={revealed} onClick={() => setRevealed((r) => !r)}>
          <LanguagesIcon className="h-[22px] w-[22px]" />
        </RailButton>
        <RailButton label="Furigana" active={showFurigana} onClick={onToggleFurigana}>
          <span className="text-lg font-bold leading-none">あ</span>
        </RailButton>
        <RailButton label="Story" onClick={() => onOpenStory(sentence)}>
          <BookOpenIcon className="h-[22px] w-[22px]" />
        </RailButton>
      </div>

      <div className="absolute bottom-[calc(6rem+env(safe-area-inset-bottom))] left-5 right-24">
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold tracking-wider text-black">
            {sentence.source.level}
          </span>
          <p className="min-w-0 truncate text-[15px] font-bold leading-tight">{sentence.source.title}</p>
        </div>
        <p className="mt-1 truncate text-xs text-white/55">{sentence.source.subtitle}</p>
        <div className="mt-2.5 flex items-center gap-2.5">
          <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">
            <span className="block h-full rounded-full bg-white/80" style={{ width: `${progress * 100}%` }} />
          </span>
          <span className="text-[10px] tabular-nums text-white/50">
            {sentence.index + 1}/{sentence.total}
          </span>
        </div>
      </div>

      {isFirst && (
        <p className="pointer-events-none absolute inset-x-0 top-[5rem] animate-pulse text-center text-[11px] font-medium tracking-wide text-white/45">
          Swipe up for more · double-tap to save
        </p>
      )}

      {burst && (
        <HeartIcon
          key={burst.key}
          onAnimationEnd={() => setBurst(null)}
          className="heart-pop pointer-events-none absolute h-24 w-24 text-[#ff5a3c] drop-shadow-[0_4px_20px_rgba(255,90,60,0.5)]"
          style={{ left: burst.x - 48, top: burst.y - 48 }}
          fill="currentColor"
          stroke="none"
        />
      )}
    </section>
  );
}
