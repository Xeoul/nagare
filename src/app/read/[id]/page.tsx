"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getItem, updateProgress, type LibraryItem } from "@/lib/library";
import { getFuriganaPreference, setFuriganaPreference } from "@/lib/preferences";
import Reader from "@/components/Reader";

export default function ReadPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<LibraryItem | null | undefined>(undefined);
  const [showFurigana, setShowFurigana] = useState(getFuriganaPreference);
  const lastSaveRef = useRef(0);

  useEffect(() => {
    void getItem(id).then((found) => setItem(found ?? null));
  }, [id]);

  function toggleFurigana() {
    setShowFurigana((prev) => {
      const next = !prev;
      setFuriganaPreference(next);
      return next;
    });
  }

  function handleProgressChange(progress: number) {
    const now = Date.now();
    if (now - lastSaveRef.current < 1000) return;
    lastSaveRef.current = now;
    void updateProgress(id, progress);
  }

  if (item === undefined) {
    return <p className="p-6 text-sm text-ink-soft">Loading…</p>;
  }

  if (item === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p>Couldn&apos;t find that item.</p>
        <Link href="/" className="text-sm text-accent hover:underline">
          Back to library
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="shrink-0 text-sm text-ink-soft hover:text-accent">
          ← Library
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-sm font-medium text-ink-soft">
          {item.title}
        </h1>
        <button
          type="button"
          onClick={toggleFurigana}
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            showFurigana
              ? "border-accent bg-accent text-paper"
              : "border-line text-ink-soft hover:border-accent hover:text-accent"
          }`}
        >
          Furigana
        </button>
      </div>
      <Reader
        text={item.text}
        initialProgress={item.progress}
        onProgressChange={handleProgressChange}
        showFurigana={showFurigana}
      />
    </div>
  );
}
