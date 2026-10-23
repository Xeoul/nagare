"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenIcon, LibraryIcon, PathIcon, QuizIcon } from "./icons";

const TABS = [
  { href: "/", label: "Library", Icon: LibraryIcon },
  { href: "/path", label: "Path", Icon: PathIcon },
  { href: "/study", label: "Study", Icon: BookOpenIcon },
  { href: "/quiz", label: "Quiz", Icon: QuizIcon },
] as const;

/**
 * The static export serves pages with a trailing slash (/study/), so compare
 * without it. /library was the library's address before it became the home page.
 */
const isActive = (pathname: string, href: string) => {
  const path = pathname.replace(/\/$/, "") || "/";
  return path === href || (href === "/" && path === "/library");
};

/**
 * A floating glass capsule. The active tab grows into a pill with its label;
 * the others stay icon-only.
 */
export default function BottomNav({
  mobile = true,
}: {
  /** false for full-screen pages (the reader) that only want the desktop sidebar. */
  mobile?: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Phones and tablets: the floating capsule at the bottom. */}
      {mobile && (
        <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden">
          <ul
            className="pointer-events-auto flex items-center gap-1 rounded-full bg-paper-raised/80 p-1.5 text-ink shadow-[0_10px_30px_-10px_rgb(var(--shadow-color)/0.35)] ring-1 ring-line backdrop-blur-2xl"
          >
            {TABS.map(({ href, label, Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    aria-label={label}
                    className={`flex h-11 items-center gap-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                      active
                        ? "bg-paper-sunk px-4 text-ink"
                        : "w-12 justify-center opacity-50 hover:opacity-90"
                    }`}
                  >
                    <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={active ? 2.2 : 1.9} />
                    {active && <span>{label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* Desktop: a sidebar down the left, so pages can use the full width. */}
      <nav
        className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-8 border-r border-line bg-paper px-4 py-7 text-ink lg:flex"
      >
        <div className="flex items-center gap-2.5 px-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-[0.55rem] bg-ink text-sm font-bold text-paper">
            流
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-ink-soft">
            Nagare
          </span>
        </div>
        <ul className="flex flex-col gap-1">
          {TABS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors ${
                    active ? "bg-paper-sunk text-ink" : "text-ink-soft hover:bg-paper-sunk/60 hover:text-ink"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.2 : 1.9} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
