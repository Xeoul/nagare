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

// Literal class strings so Tailwind picks them up — one muted, dark
// gradient per card, chosen by hashing the sentence so a card keeps its
// look when you scroll back to it.
const GRADIENTS = [
  "from-[#1b2a3a] via-[#131d27] to-[#0a0f14]",
  "from-[#2b1d2e] via-[#1c1420] to-[#0f0a12]",
  "from-[#1d2b24] via-[#141e19] to-[#0a100d]",
  "from-[#2e2418] via-[#1f1810] to-[#120e09]",
  "from-[#1f2233] via-[#161826] to-[#0c0d16]",
  "from-[#2b1c1c] via-[#1d1414] to-[#110b0b]",
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

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
              i === highlightIndex ? "text-amber-300" : ""
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
      className="flex flex-col items-center gap-1 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] transition-transform active:scale-90"
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
          active ? "bg-white/25" : "bg-white/10"
        }`}
      >
        {children}
      </span>
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
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

  const gradient = GRADIENTS[hash(sentence.text) % GRADIENTS.length];
  const watermark =
    sentence.text.match(/[一-鿿]/)?.[0] ?? sentence.text.match(/[぀-ヿ]/)?.[0] ?? "";
  const rubyStyle =
    "[line-break:strict] [&_rt]:text-[0.42em] [&_rt]:font-normal [&_rt]:text-white/55";

  const translationBlock = revealed ? (
    <p className="mt-6 max-w-md text-base leading-relaxed text-white/80">
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
      className="mt-7 self-start rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/85 backdrop-blur-sm transition-colors active:bg-white/20"
    >
      Tap to see translation
    </button>
  );

  return (
    <section
      onClick={handleTap}
      className={`relative h-dvh w-full cursor-pointer snap-start snap-always select-none overflow-hidden bg-gradient-to-b text-white [touch-action:manipulation] ${gradient}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-[12vw] top-1/2 -translate-y-1/2 font-display text-[70vw] leading-none text-white/[0.035] sm:text-[40vh]"
      >
        {watermark}
      </span>

      <div className="absolute inset-0 flex flex-col justify-center px-6 pb-44 pr-20 pt-24">
        {spotlight ? (
          <>
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/45">
              Word spotlight
            </p>
            <p className="mt-5 min-h-7 text-lg text-white/60">
              {spotlight.entry.reading !== spotlight.key ? spotlight.entry.reading : ""}
            </p>
            <h2 className="font-display text-6xl font-bold leading-tight">{spotlight.key}</h2>
            <p className="mt-3 text-lg leading-snug text-white/90">
              {spotlight.entry.meanings.slice(0, 3).join("; ")}
            </p>
            <p className="mt-1.5 text-xs text-white/50">
              {spotlight.entry.pos}
              {spotlight.entry.level ? ` · ${spotlight.entry.level}` : ""}
            </p>
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
                In context
              </p>
              <p className={`font-display text-xl leading-[2.3] ${rubyStyle}`}>
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
              className={`font-display text-[1.75rem] font-medium leading-[2.25] sm:text-4xl sm:leading-[2.2] ${rubyStyle}`}
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

      <div className="absolute bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-3 flex flex-col items-center gap-5">
        <RailButton label={saved ? "Saved" : "Save"} active={saved} onClick={() => void save(false)}>
          <HeartIcon
            className={`h-6 w-6 transition-colors ${saved ? "text-rose-500" : ""}`}
            fill={saved ? "currentColor" : "none"}
          />
        </RailButton>
        <RailButton label="Translate" active={revealed} onClick={() => setRevealed((r) => !r)}>
          <LanguagesIcon className="h-6 w-6" />
        </RailButton>
        <RailButton label="Furigana" active={showFurigana} onClick={onToggleFurigana}>
          <span className="font-display text-lg font-bold leading-none">あ</span>
        </RailButton>
        <RailButton label="Story" onClick={() => onOpenStory(sentence)}>
          <BookOpenIcon className="h-6 w-6" />
        </RailButton>
      </div>

      <div className="absolute bottom-[calc(5rem+env(safe-area-inset-bottom))] left-5 right-20">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider backdrop-blur-sm">
            {sentence.source.level}
          </span>
          <span className="text-[11px] text-white/55">
            Line {sentence.index + 1} of {sentence.total}
          </span>
        </div>
        <p className="mt-1.5 font-display text-lg leading-tight">{sentence.source.title}</p>
        <p className="truncate text-xs text-white/55">{sentence.source.subtitle}</p>
      </div>

      {isFirst && (
        <p className="pointer-events-none absolute inset-x-0 top-[4.5rem] animate-pulse text-center text-[11px] tracking-wide text-white/45">
          Swipe up for more · double-tap to save
        </p>
      )}

      {burst && (
        <HeartIcon
          key={burst.key}
          onAnimationEnd={() => setBurst(null)}
          className="heart-pop pointer-events-none absolute h-24 w-24 text-rose-500 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
          style={{ left: burst.x - 48, top: burst.y - 48 }}
          fill="currentColor"
          stroke="none"
        />
      )}
    </section>
  );
}
