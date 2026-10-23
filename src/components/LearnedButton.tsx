"use client";

import { statusOf, toggleLearned, useProgress } from "@/lib/progress";

/** Marks an item as studied; it then shows up in the quiz and on your Path. */
export default function LearnedButton({ id }: { id: string }) {
  const rec = useProgress()[id];
  const status = statusOf(rec);
  const learned = !!rec?.l;
  const tone =
    status === "mastered"
      ? "bg-emerald-600 text-white"
      : learned
        ? "bg-emerald-100 text-emerald-800"
        : status === "weak"
          ? "bg-amber-100 text-amber-800"
          : "bg-paper-sunk text-ink-soft hover:text-ink";
  return (
    <button
      type="button"
      aria-pressed={learned}
      onClick={() => toggleLearned(id)}
      className={`h-7 shrink-0 rounded-full px-3 text-xs font-semibold transition-colors ${tone}`}
    >
      {status === "mastered" ? "✓ Mastered" : learned ? "✓ Learned" : status === "weak" ? "Review" : "Mark learned"}
    </button>
  );
}
