import type { ReactNode } from "react";

/** The shared large-title header: hanko stamp, wordmark, then the page title. */
export default function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-2.5">
        <span className="stamp h-7 w-7 text-sm">流</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-ink-soft">
          Nagare
        </span>
      </div>
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-[2.5rem] font-bold leading-none tracking-[-0.03em]">{title}</h1>
        {children}
      </div>
    </header>
  );
}
