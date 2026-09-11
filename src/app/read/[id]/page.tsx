"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getItem, updateProgress, type LibraryItem } from "@/lib/library";
import Reader from "@/components/Reader";

export default function ReadPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<LibraryItem | null | undefined>(undefined);
  const lastSaveRef = useRef(0);

  useEffect(() => {
    void getItem(id).then((found) => setItem(found ?? null));
  }, [id]);

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
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="text-sm text-ink-soft hover:text-accent">
          ← Library
        </Link>
        <h1 className="truncate text-sm font-medium text-ink-soft">{item.title}</h1>
      </div>
      <Reader
        text={item.text}
        initialProgress={item.progress}
        onProgressChange={handleProgressChange}
      />
    </div>
  );
}
