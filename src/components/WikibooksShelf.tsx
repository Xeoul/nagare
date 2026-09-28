"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WIKIBOOKS_READERS, fetchReaderText, type WikibooksReader } from "@/lib/wikibooks-readers";
import { addItem, listItems } from "@/lib/library";
import CoverTile, { Shelf } from "./CoverTile";

export default function WikibooksShelf() {
  const router = useRouter();
  const [loadingTitle, setLoadingTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function open(reader: WikibooksReader) {
    setError(null);
    setLoadingTitle(reader.title);
    try {
      const existing = (await listItems()).find(
        (item) => item.kind === "reader" && item.title === reader.title,
      );
      const item =
        existing ??
        (await addItem({
          title: reader.title,
          kind: "reader",
          text: await fetchReaderText(reader),
        }));
      router.push(`/read?id=${encodeURIComponent(item.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't load that one.");
    } finally {
      setLoadingTitle(null);
    }
  }

  return (
    <>
      <Shelf
        title="Fairy tales"
        caption={
          <>
            Real N5 folk tales from{" "}
            <a
              href="https://en.wikibooks.org/wiki/Japanese/Reader"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-line underline-offset-2"
            >
              Wikibooks
            </a>{" "}
            (CC BY-SA 4.0).
          </>
        }
      >
        {WIKIBOOKS_READERS.map((reader) => (
          <CoverTile
            key={reader.slug}
            title={reader.title}
            badge={reader.level}
            subtitle={reader.author ?? reader.note}
            loading={loadingTitle === reader.title}
            disabled={loadingTitle !== null}
            onOpen={() => void open(reader)}
          />
        ))}
      </Shelf>
      {error && <p className="-mt-6 px-5 text-sm text-accent-warm">{error}</p>}
    </>
  );
}
