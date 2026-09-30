import type { ReactNode } from "react";
import { coverStyle } from "@/lib/cover";

/** A book cover with generated art — the tile every shelf is built from. */
export default function CoverTile({
  title,
  badge,
  subtitle,
  loading,
  disabled,
  onOpen,
}: {
  title: string;
  badge?: string;
  subtitle?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      className="group flex w-[9.5rem] shrink-0 snap-start flex-col gap-2 text-left transition-transform active:scale-[0.97] disabled:opacity-60"
    >
      <span
        style={coverStyle(title)}
        className="relative flex aspect-[3/4] w-full overflow-hidden rounded-2xl text-white shadow-[0_8px_20px_-14px_rgb(var(--shadow-color)/0.5)] ring-1 ring-black/5"
      >
        <span className="absolute inset-x-3 bottom-3 line-clamp-3 text-[17px] font-semibold leading-snug tracking-tight text-white/95">
          {title}
        </span>
        {badge && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white/85">
            {badge}
          </span>
        )}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-semibold backdrop-blur-sm">
            Opening…
          </span>
        )}
      </span>
      {subtitle && <span className="block truncate px-0.5 text-xs text-ink-soft">{subtitle}</span>}
    </button>
  );
}

/** A titled, horizontally swiping row of cover tiles. */
export function Shelf({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="px-5">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {caption && <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">{caption}</p>}
      </div>
      <div className="no-scrollbar flex snap-x snap-mandatory gap-3.5 overflow-x-auto scroll-px-5 px-5 pb-2">
        {children}
      </div>
    </section>
  );
}
