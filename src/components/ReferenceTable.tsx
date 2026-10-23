"use client";

import type { ReferenceSection } from "@/data/reference";
import { speak } from "@/lib/speech";

/** One reference table. A cell like "か|ka" is a kana with its romaji; tapping it speaks it. */
export default function ReferenceTable({ section }: { section: ReferenceSection }) {
  const kana = section.rows.some((row) => row.some((cell) => cell.includes("|")));
  return (
    <li className="card flex flex-col gap-3 px-4 py-4 lg:px-5">
      <div>
        <h3 className="text-lg font-bold">{section.title}</h3>
        {section.intro && <p className="mt-0.5 text-sm text-ink-soft">{section.intro}</p>}
      </div>
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full border-collapse text-left text-sm">
          {section.head && (
            <thead>
              <tr>
                {section.head.map((h, i) => (
                  <th key={i} className="whitespace-nowrap px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {section.rows.map((row, ri) => (
              <tr key={ri} className="border-t border-line">
                {row.map((cell, ci) => {
                  if (cell.includes("|")) {
                    const [text, romaji] = cell.split("|");
                    return (
                      <td key={ci} className="px-1 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => speak(text)}
                          aria-label={`${text} (${romaji})`}
                          className="flex w-full min-w-11 flex-col items-center rounded-lg px-1 py-1 transition-colors hover:bg-paper-sunk"
                        >
                          <span className="text-2xl font-semibold leading-tight" lang="ja">
                            {text}
                          </span>
                          <span className="text-[11px] text-ink-soft">{romaji}</span>
                        </button>
                      </td>
                    );
                  }
                  return (
                    <td
                      key={ci}
                      lang="ja"
                      className={`px-2 py-2 align-top ${ci === 0 ? "whitespace-nowrap font-semibold" : ""} ${kana ? "text-center text-xs text-ink-soft" : ""}`}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {section.note && <p className="text-sm leading-relaxed text-ink-soft">{section.note}</p>}
    </li>
  );
}
