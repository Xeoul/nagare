"use client";

import { FONT_SCALES, type ReaderPrefs, type ReaderTheme } from "@/lib/preferences";

const THEMES: { id: ReaderTheme; label: string; swatch: string }[] = [
  { id: "auto", label: "Auto", swatch: "linear-gradient(135deg, #fbfaf7 50%, #0f0f10 50%)" },
  { id: "light", label: "White", swatch: "#fbfaf7" },
  { id: "sepia", label: "Sepia", swatch: "#f3e9d4" },
  { id: "dark", label: "Dark", swatch: "#0f0f10" },
];

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid rounded-full bg-paper-sunk p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`rounded-full py-1.5 text-[13px] font-semibold transition-colors ${
            value === option.id ? "bg-paper-thumb text-ink shadow-sm" : "text-ink-soft"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** The reader's "Aa" panel: text size, spacing, page colour and page turning vs scrolling. */
export default function ReaderSettings({
  prefs,
  onChange,
}: {
  prefs: ReaderPrefs;
  onChange: (prefs: ReaderPrefs) => void;
}) {
  const set = (patch: Partial<ReaderPrefs>) => onChange({ ...prefs, ...patch });

  return (
    <div className="flex flex-col gap-4 rounded-[1.5rem] bg-paper-raised p-4 shadow-[0_0_0_1px_rgb(var(--shadow-color)/0.06),0_16px_40px_-12px_rgb(var(--shadow-color)/0.35)]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Smaller text"
          disabled={prefs.fontStep === 0}
          onClick={() => set({ fontStep: prefs.fontStep - 1 })}
          className="flex h-10 w-12 items-center justify-center rounded-full bg-paper-sunk text-sm font-semibold disabled:opacity-30"
        >
          A
        </button>
        <div className="flex flex-1 items-center justify-center gap-1.5">
          {FONT_SCALES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${i <= prefs.fontStep ? "bg-ink" : "bg-line"}`}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Larger text"
          disabled={prefs.fontStep === FONT_SCALES.length - 1}
          onClick={() => set({ fontStep: prefs.fontStep + 1 })}
          className="flex h-10 w-12 items-center justify-center rounded-full bg-paper-sunk text-xl font-semibold disabled:opacity-30"
        >
          A
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-soft">Spacing</p>
        <Segmented
          value={prefs.spacing}
          onChange={(spacing) => set({ spacing })}
          options={[
            { id: "compact", label: "Compact" },
            { id: "normal", label: "Normal" },
            { id: "relaxed", label: "Relaxed" },
          ]}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-soft">Page colour</p>
        <div className="grid grid-cols-4 gap-2">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => set({ theme: theme.id })}
              className="flex flex-col items-center gap-1 text-[12px] font-medium text-ink-soft"
            >
              <span
                style={{ background: theme.swatch }}
                className={`h-9 w-9 rounded-full ring-1 ring-black/10 ${
                  prefs.theme === theme.id ? "outline outline-2 outline-offset-2 outline-ink" : ""
                }`}
              />
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-soft">Layout</p>
        <Segmented
          value={prefs.paged ? "pages" : "scroll"}
          onChange={(layout) => set({ paged: layout === "pages" })}
          options={[
            { id: "pages", label: "Pages" },
            { id: "scroll", label: "Scroll" },
          ]}
        />
      </div>
    </div>
  );
}
