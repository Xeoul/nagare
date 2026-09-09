"use client";

import { useEffect, useRef, useState, type UIEvent } from "react";
import { getTokenizer, isLookupable, lookupKey, type Token } from "@/lib/tokenizer";
import { lookupDictionary, type DictionaryEntry } from "@/lib/dictionary";
import LookupSheet from "./LookupSheet";

type Props = {
  text: string;
  initialProgress: number;
  onProgressChange: (progress: number) => void;
};

export default function Reader({ text, initialProgress, onProgressChange }: Props) {
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [selected, setSelected] = useState<{ token: Token; entry: DictionaryEntry | null } | null>(
    null,
  );
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
    const el = scrollRef.current;
    if (!tokens || !el || hasRestoredScroll.current) return;
    hasRestoredScroll.current = true;
    el.scrollTop = (el.scrollHeight - el.clientHeight) * initialProgress;
  }, [tokens, initialProgress]);

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
        className="h-[calc(100vh-160px)] overflow-y-auto rounded border border-line bg-paper-raised/60 p-6 text-xl leading-loose"
      >
        {tokens.map((token, index) =>
          isLookupable(token) ? (
            <button
              key={index}
              type="button"
              onClick={() =>
                setSelected({
                  token,
                  entry: lookupDictionary(lookupKey(token), token.surface_form),
                })
              }
              className="rounded px-0.5 transition-colors hover:bg-accent/10 focus-visible:bg-accent/10"
            >
              {token.surface_form}
            </button>
          ) : (
            <span key={index} className="whitespace-pre-wrap">
              {token.surface_form}
            </span>
          ),
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
