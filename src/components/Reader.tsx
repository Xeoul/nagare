"use client";

import { useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { getTokenizer, isLookupable, lookupKey, type Token } from "@/lib/tokenizer";
import { loadDictionary, lookupDictionary, type JmdictEntry, type JmdictLookup } from "@/lib/dictionary";
import { getFurigana } from "@/lib/furigana";
import { isTranslatable, sentenceText, splitIntoSentences } from "@/lib/sentences";
import { translateSentence } from "@/lib/translate";
import LookupSheet from "./LookupSheet";

type Props = {
  text: string;
  initialProgress: number;
  onProgressChange: (progress: number) => void;
  showFurigana: boolean;
  showTranslation: boolean;
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
  dictionary,
  selectedIndex,
  onSelect,
}: {
  sentence: Token[];
  startIndex: number;
  showFurigana: boolean;
  showTranslation: boolean;
  dictionary: JmdictLookup | null;
  selectedIndex: number | null;
  onSelect: (selected: Selected) => void;
}) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const ref = useRef<HTMLSpanElement>(null);
  const translatable = isTranslatable(sentence);

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
      <span ref={ref}>
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
      {showTranslation && translatable && (
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

export default function Reader({
  text,
  initialProgress,
  onProgressChange,
  showFurigana,
  showTranslation,
}: Props) {
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [dictionary, setDictionary] = useState<JmdictLookup | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasRestoredScroll = useRef(false);

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
    el.scrollTop = (el.scrollHeight - el.clientHeight) * initialProgress;
  }, [tokens, initialProgress]);

  const sentences = useMemo(() => {
    if (!tokens) return [];
    let offset = 0;
    return splitIntoSentences(tokens).map((sentence) => {
      const startIndex = offset;
      offset += sentence.length;
      return { sentence, startIndex };
    });
  }, [tokens]);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    onProgressChange(max > 0 ? el.scrollTop / max : 1);
  }

  if (!tokens) {
    return <p className="text-sm text-ink-soft">Reading through the text…</p>;
  }

  return (
    <>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`h-[calc(100vh-160px)] overflow-y-auto rounded border border-line bg-paper-raised/60 p-6 text-xl [line-break:strict] [&_rt]:text-[0.5em] [&_rt]:font-normal [&_rt]:text-ink-soft ${
          showFurigana ? "leading-[2.6]" : "leading-loose"
        }`}
      >
        {sentences.map(({ sentence, startIndex }) => (
          <Sentence
            key={startIndex}
            sentence={sentence}
            startIndex={startIndex}
            showFurigana={showFurigana}
            showTranslation={showTranslation}
            dictionary={dictionary}
            selectedIndex={selected?.index ?? null}
            onSelect={setSelected}
          />
        ))}
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
