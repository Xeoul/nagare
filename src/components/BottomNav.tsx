"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookmarkIcon, HomeIcon, LibraryIcon } from "./icons";

const TABS = [
  { href: "/", label: "Feed", Icon: HomeIcon },
  { href: "/library", label: "Library", Icon: LibraryIcon },
  { href: "/words", label: "Saved", Icon: BookmarkIcon },
] as const;

/** Instagram-style tab bar. "dark" floats over the full-bleed feed; "default" follows the app theme. */
export default function BottomNav({ variant = "default" }: { variant?: "dark" | "default" }) {
  const pathname = usePathname();
  const dark = variant === "dark";

  return (
    <nav
      className={`fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-md ${
        dark ? "border-white/10 bg-black/55 text-white" : "border-line/70 bg-paper/85 text-ink"
      }`}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium tracking-wide transition-opacity ${
                  active ? "opacity-100" : "opacity-55 hover:opacity-80"
                }`}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
