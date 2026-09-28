"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CLASSICS, fetchClassicText, type ClassicWork } from "@/lib/aozora";
import { addItem, listItems } from "@/lib/library";
import CoverTile, { Shelf } from "./CoverTile";

const LEVEL_ORDER: ClassicWork["level"][] = ["N3", "N2"];

export default function ClassicsShelf() {
  const router = useRouter();
  const [loadingTitle, setLoadingTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function open(work: ClassicWork) {
    setError(null);
    setLoadingTitle(work.title);
    try {
      const existing = (await listItems()).find(
        (item) => item.kind === "classic" && item.title === work.title,
      );
      const item =
        existing ??
        (await addItem({
          title: work.title,
          kind: "classic",
          text: await fetchClassicText(work),
        }));
      router.push(`/read?id=${encodeURIComponent(item.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't load that one.");
    } finally {
      setLoadingTitle(null);
    }
  }

  const works = LEVEL_ORDER.flatMap((level) =>
    CLASSICS.filter((w) => w.level === level).sort((a, b) => a.density - b.density),
  );

  return (
    <>
      <Shelf
        title="Classics"
        caption={
          <>
            Public-domain literature from{" "}
            <a
              href="https://www.aozora.gr.jp/"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-line underline-offset-2"
            >
              Aozora Bunko
            </a>
            . Levels are estimated from vocabulary, not official.
          </>
        }
      >
        {works.map((work) => (
          <CoverTile
            key={work.path}
            title={work.title}
            badge={`~${work.level}`}
            subtitle={work.author}
            loading={loadingTitle === work.title}
            disabled={loadingTitle !== null}
            onOpen={() => void open(work)}
          />
        ))}
      </Shelf>
      {error && <p className="-mt-6 px-5 text-sm text-accent-warm">{error}</p>}
    </>
  );
}
