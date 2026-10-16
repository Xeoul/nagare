"use client";

import { useState } from "react";
import TADOKU_BOOKS from "@/data/tadoku-books.json";
import CoverTile, { Shelf } from "./CoverTile";

/** Shown before "Show all", so 141 covers don't swamp the library. */
const INITIAL_COUNT = 12;

/**
 * NPO 多言語多読's free graded readers. These are CC BY-NC-ND 4.0 and their
 * FAQ forbids redistributing them with anything added, so the books aren't
 * bundled: each tile opens the book's page on tadoku.org (linking with
 * credit is explicitly allowed), where the PDF can be downloaded and then
 * imported here for your own reading.
 */
export default function TadokuShelf() {
  const [showAll, setShowAll] = useState(false);
  const books = showAll ? TADOKU_BOOKS : TADOKU_BOOKS.slice(0, INITIAL_COUNT);

  return (
    <Shelf
      title="Tadoku free books"
      caption={
        <>
          {TADOKU_BOOKS.length} illustrated graded readers by{" "}
          <a
            href="https://tadoku.org/japanese/free-books/"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-line underline-offset-2"
          >
            NPO 多言語多読
          </a>{" "}
          (CC BY-NC-ND 4.0). They open on Tadoku&apos;s site: download the PDF there, then
          import it below to read it here.
        </>
      }
    >
      {books.map((book) => (
        <CoverTile
          key={book.url}
          title={book.title}
          badge={book.level === "start" ? "Start" : `Lv ${book.level}`}
          subtitle="Opens tadoku.org ↗"
          onOpen={() => window.open(book.url, "_blank", "noopener,noreferrer")}
        />
      ))}
      {!showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="flex aspect-[3/4] w-[9.5rem] shrink-0 snap-start items-center justify-center rounded-2xl border border-dashed border-line text-sm font-semibold text-ink-soft transition-colors hover:text-ink lg:w-auto"
        >
          Show all {TADOKU_BOOKS.length}
        </button>
      )}
    </Shelf>
  );
}
