"use client";

import { useState, type ReactNode } from "react";
import { canSpeak, speak } from "@/lib/speech";

export type Tint = "word" | "grammar" | "story" | "fact" | "quiz";

/**
 * One full-screen card in the feed. Snaps into place like a reel; content
 * is centered in the space between the top bar and the bottom edge, and
 * scrolls within the card if a long one (grammar, mostly) overflows.
 */
export function CardShell({
  tint,
  label,
  meta,
  rail,
  children,
}: {
  tint: Tint;
  label: string;
  meta?: ReactNode;
  rail?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`feed-card tint-${tint} relative flex h-[100dvh] w-full snap-start snap-always`}>
      <div className="mx-auto flex h-full w-full max-w-xl flex-col overflow-y-auto px-6 pt-20 pb-10">
        <div className="my-auto flex flex-col gap-5 py-4 pr-12">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium tracking-[0.12em] uppercase">
            <span className="rounded-full bg-ink/[0.07] px-2.5 py-1 text-ink">{label}</span>
            {meta && <span className="text-ink-soft normal-case tracking-normal">{meta}</span>}
          </div>
          {children}
        </div>
      </div>
      {rail && (
        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 sm:right-[max(0.75rem,calc(50%-18rem))]">
          {rail}
        </div>
      )}
    </section>
  );
}

/** English that stays blurred until tapped — try reading it first, then check. */
export function Reveal({ text, className = "" }: { text: string; className?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setShown(true)}
      aria-label={shown ? undefined : "Show translation"}
      className={`block w-full text-left text-base text-ink-soft transition-[filter] duration-300 ${
        shown ? "" : "cursor-pointer blur-[6px] select-none"
      } ${className}`}
    >
      {text}
    </button>
  );
}

export function RailButton({
  label,
  active = false,
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
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className="flex flex-col items-center gap-1 text-[11px] text-ink-soft"
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-sm backdrop-blur transition-all active:scale-90 ${
          active ? "border-accent bg-accent text-paper" : "border-line/80 bg-paper/80 text-ink"
        }`}
      >
        {children}
      </span>
      {label}
    </button>
  );
}

export function ListenButton({ text }: { text: string }) {
  if (!canSpeak()) return null;
  return (
    <RailButton label="Listen" onClick={() => speak(text)}>
      <SpeakerIcon />
    </RailButton>
  );
}

export function SaveButton({ saved, onClick }: { saved: boolean; onClick: () => void }) {
  return (
    <RailButton label={saved ? "Saved" : "Save"} active={saved} onClick={onClick}>
      <BookmarkIcon filled={saved} />
    </RailButton>
  );
}

export function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

export function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 3h12v18l-6-4-6 4V3Z" />
    </svg>
  );
}
