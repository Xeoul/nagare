"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookmarkIcon, HomeIcon, LibraryIcon } from "./icons";

const TABS = [
  { href: "/", label: "Feed", Icon: HomeIcon },
  { href: "/library", label: "Library", Icon: LibraryIcon },
  { href: "/words", label: "Saved", Icon: BookmarkIcon },
] as const;

/**
 * A floating glass capsule. The active tab grows into a pill with its label;
 * the others stay icon-only. "dark" floats over the full-bleed feed;
 * "default" follows the app theme.
 */
export default function BottomNav({ variant = "default" }: { variant?: "dark" | "default" }) {
  const pathname = usePathname();
  const dark = variant === "dark";

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <ul
        className={`pointer-events-auto flex items-center gap-1 rounded-full p-1.5 backdrop-blur-2xl ${
          dark
            ? "bg-white/10 text-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
            : "bg-paper-raised/80 text-ink shadow-[0_10px_30px_-10px_rgb(var(--shadow-color)/0.35)] ring-1 ring-line"
        }`}
      >
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                className={`flex h-11 items-center gap-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                  active
                    ? `px-4 ${dark ? "bg-white text-black" : "bg-ink text-paper"}`
                    : "w-12 justify-center opacity-60 hover:opacity-100"
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
  );
}
