"use client";

import type { Tok } from "@/lib/content";
import { useFeed } from "./FeedContext";

function Surface({ token, furigana }: { token: Tok; furigana: boolean }) {
  if (!furigana || !token.f) return token.s;
  const [before, kanji, reading, after] = token.f;
  return (
    <>
      {before}
      <ruby>
        {kanji}
        <rt>{reading}</rt>
      </ruby>
      {after}
    </>
  );
}

/**
 * A Japanese sentence where every word is tappable for its meaning. The
 * word a card is teaching (h) is underlined in the accent color.
 */
export default function TokenLine({
  tokens,
  className = "",
  inline = false,
}: {
  tokens: Tok[];
  className?: string;
  /** Render as a span, for splicing into a larger line (a quiz blank). */
  inline?: boolean;
}) {
  const { furigana, openGloss } = useFeed();
  const Tag = inline ? "span" : "p";

  return (
    <Tag lang="ja" className={inline ? className : `font-display leading-[2.1] ${className}`}>
      {tokens.map((token, i) => {
        const highlight = token.h
          ? "text-accent underline decoration-accent/60 decoration-2 underline-offset-[6px]"
          : "";
        return token.g ? (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openGloss(token.g!);
            }}
            className={`rounded-md px-[1px] transition-colors hover:bg-accent/10 active:bg-accent/20 ${highlight}`}
          >
            <Surface token={token} furigana={furigana} />
          </button>
        ) : (
          <span key={i} className={highlight}>
            <Surface token={token} furigana={furigana} />
          </span>
        );
      })}
    </Tag>
  );
}
