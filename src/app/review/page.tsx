"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeftIcon, SpeakerIcon } from "@/components/icons";
import { getDueWords, gradeWord, previewIntervals, type Grade, type ReviewItem } from "@/lib/review";
import { speak } from "@/lib/speech";

const GRADES: { grade: Grade; label: string }[] = [
  { grade: "again", label: "Again" },
  { grade: "hard", label: "Hard" },
  { grade: "good", label: "Good" },
  { grade: "easy", label: "Easy" },
];

export default function ReviewPage() {
  const [queue, setQueue] = useState<ReviewItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    void getDueWords().then((due) => {
      setQueue(due);
      setTotal(due.length);
    });
  }, []);

  const current = queue?.[0];

  async function grade(value: Grade) {
    if (!current || !queue) return;
    await gradeWord(current.key, value);
    setRevealed(false);
    // "Again" sends the word to the back of this session instead of
    // dropping it, so you see it once more before you finish.
    if (value === "again") {
      setQueue([...queue.slice(1), { ...current, schedule: undefined }]);
    } else {
      setQueue(queue.slice(1));
      setDone((n) => n + 1);
    }
  }

  const intervals = current ? previewIntervals(current.schedule) : null;
  const progress = total > 0 ? done / total : 0;

  return (
    <div className="mx-auto flex h-dvh w-full max-w-lg flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3">
        <Link
          href="/words"
          aria-label="Back"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper-raised shadow-[0_0_0_1px_rgb(var(--shadow-color)/0.06),0_4px_12px_-6px_rgb(var(--shadow-color)/0.3)] transition-transform active:scale-90"
        >
          <ChevronLeftIcon className="h-5 w-5" strokeWidth={2.2} />
        </Link>
        <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-paper-sunk">
          <span
            className="block h-full rounded-full bg-ink/50 transition-[width] duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </span>
        <span className="w-12 text-right text-xs tabular-nums text-ink-soft">
          {total > 0 ? `${Math.min(done + 1, total)}/${total}` : ""}
        </span>
      </div>

      {queue === null ? (
        <p className="m-auto text-sm text-ink-soft">Loading…</p>
      ) : !current ? (
        <div className="m-auto flex flex-col items-center gap-3 text-center">
          <p className="text-2xl font-bold tracking-tight">{total > 0 ? "All done" : "Nothing due"}</p>
          <p className="max-w-xs text-sm leading-relaxed text-ink-soft">
            {total > 0
              ? `You reviewed ${total} ${total === 1 ? "word" : "words"}. They'll come back when they're due.`
              : "Saved words show up here when it's time to review them."}
          </p>
          <Link
            href="/words"
            className="mt-3 rounded-full bg-paper-sunk px-5 py-2.5 text-sm font-semibold transition-transform active:scale-95"
          >
            Back to Saved
          </Link>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="card my-6 flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"
          >
            <p className="min-h-6 text-base text-ink-soft">
              {revealed && current.reading !== current.key ? current.reading : ""}
            </p>
            <p className="break-all text-[3.25rem] font-semibold leading-tight tracking-tight">
              {current.key}
            </p>
            {revealed ? (
              <p className="mt-2 max-w-sm text-[17px] leading-snug">
                {current.meanings.slice(0, 3).join("; ")}
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Tap to show the meaning</p>
            )}
            <span
              role="button"
              tabIndex={0}
              aria-label="Listen"
              onClick={(event) => {
                event.stopPropagation();
                speak(current.reading || current.key);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  speak(current.reading || current.key);
                }
              }}
              className="mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-paper-sunk text-ink-soft transition-colors hover:text-ink"
            >
              <SpeakerIcon className="h-5 w-5" />
            </span>
          </button>

          {revealed ? (
            <div className="grid grid-cols-4 gap-2">
              {GRADES.map(({ grade: value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => void grade(value)}
                  className={`flex h-14 flex-col items-center justify-center rounded-2xl text-sm font-semibold transition-transform active:scale-95 ${
                    value === "good" ? "bg-ink text-paper" : "bg-paper-sunk text-ink"
                  }`}
                >
                  {label}
                  <span className="text-[10px] font-medium opacity-60">{intervals?.[value]}</span>
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="h-14 rounded-2xl bg-ink text-[15px] font-semibold text-paper transition-transform active:scale-[0.98]"
            >
              Show answer
            </button>
          )}
        </>
      )}
    </div>
  );
}
