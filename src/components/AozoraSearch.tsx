"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchAozoraWork,
  loadAozoraCatalog,
  searchAozora,
  type AozoraWork,
} from "@/lib/aozoraCatalog";
import { addItem, listItems } from "@/lib/library";

/** Good starting points: authors with plenty of shorter, more approachable works. */
const SUGGESTED_AUTHORS = ["新美南吉", "小川未明", "宮沢賢治", "芥川竜之介", "夏目漱石", "太宰治", "江戸川乱歩", "坂口安吾"];

/**
 * Search the whole of Aozora Bunko (≈10,000 public-domain works in modern
 * spelling) and import any one in a tap. The catalog loads on first focus.
 */
export default function AozoraSearch() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<AozoraWork[] | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [query, setQuery] = useState("");
  const [opening, setOpening] = useState<number | null>(null);
  const [error, setError] = useState<{ message: string; work?: AozoraWork } | null>(null);

  const results = useMemo(() => (catalog ? searchAozora(catalog, query) : []), [catalog, query]);

  function ensureCatalog() {
    if (catalog || loadingCatalog) return;
    setLoadingCatalog(true);
    loadAozoraCatalog()
      .then(setCatalog)
      .catch(() => setError({ message: "Couldn't load the Aozora Bunko catalog. Try again in a moment." }))
      .finally(() => setLoadingCatalog(false));
  }

  async function open(work: AozoraWork) {
    setError(null);
    setOpening(work.id);
    try {
      const existing = (await listItems()).find(
        (item) => item.kind === "classic" && item.title === work.title,
      );
      const item =
        existing ?? (await addItem({ title: work.title, kind: "classic", text: await fetchAozoraWork(work) }));
      router.push(`/read?id=${encodeURIComponent(item.id)}`);
    } catch (cause) {
      setError({ message: cause instanceof Error ? cause.message : "Couldn't open that one.", work });
    } finally {
      setOpening(null);
    }
  }

  return (
    <section className="flex flex-col gap-3 px-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Search Aozora Bunko</h2>
        <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
          Over 10,000 public-domain books and stories from{" "}
          Aozora Bunko
          . Search by title or author, in kanji or kana.
        </p>
      </div>

      <input
        type="search"
        value={query}
        onFocus={ensureCatalog}
        onChange={(event) => {
          ensureCatalog();
          setQuery(event.target.value);
        }}
        placeholder="e.g. 坊っちゃん, 宮沢賢治, ごんぎつね"
        className="h-12 w-full rounded-2xl bg-paper-raised px-4 text-[15px] shadow-[0_0_0_1px_rgb(var(--shadow-color)/0.06)] outline-none placeholder:text-ink-soft/60 focus:shadow-[0_0_0_2px_rgb(var(--shadow-color)/0.2)] lg:max-w-xl"
      />

      {!query && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_AUTHORS.map((author) => (
            <button
              key={author}
              type="button"
              onClick={() => {
                ensureCatalog();
                setQuery(author);
              }}
              className="rounded-full bg-paper-sunk px-3 py-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {author}
            </button>
          ))}
        </div>
      )}

      {query && loadingCatalog && <p className="text-sm text-ink-soft">Loading the catalog…</p>}
      {query && catalog && results.length === 0 && (
        <p className="text-sm text-ink-soft">No works match “{query}”.</p>
      )}

      {error && (
        <p className="text-sm text-accent-warm">
          {error.message}{" "}
        </p>
      )}

      {results.length > 0 && (
        <ul className="flex flex-col overflow-hidden rounded-[1.25rem] bg-paper-raised shadow-[0_0_0_1px_rgb(var(--shadow-color)/0.05),0_8px_24px_-12px_rgb(var(--shadow-color)/0.12)] lg:max-w-3xl">
          {results.map((work) => (
            <li key={work.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                disabled={opening !== null}
                onClick={() => void open(work)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-paper-sunk/60 disabled:opacity-60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{work.title}</span>
                  <span className="block truncate text-xs text-ink-soft">{work.author}</span>
                </span>
                <span className="shrink-0 text-xs font-medium text-ink-soft">
                  {opening === work.id ? "Opening…" : "Read"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {results.length === 60 && (
        <p className="text-xs text-ink-soft">Showing the first 60 matches — narrow the search to see more.</p>
      )}
    </section>
  );
}
