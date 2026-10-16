"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STARTER_READINGS, type StarterReading } from "@/data/starter-readings";
import { addItem, listItems } from "@/lib/library";
import CoverTile, { Shelf } from "./CoverTile";


const RANGES = {
  beginner: {
    levels: ["N5", "N4"],
    title: "Graded readings",
    caption: "Short originals written for Nagare at N5–N4, checked against JLPT word lists.",
  },
  advanced: {
    levels: ["N3", "N2", "N1"],
    title: "Going further",
    caption: "Original stories and essays written for Nagare at N3, N2 and N1.",
  },
} satisfies Record<string, { levels: StarterReading["level"][]; title: string; caption: string }>;

/** The original graded readings, one shelf per difficulty range. */
export default function StarterShelf({ range }: { range: keyof typeof RANGES }) {
  const router = useRouter();
  const [loadingTitle, setLoadingTitle] = useState<string | null>(null);

  async function open(reading: StarterReading) {
    setLoadingTitle(reading.title);
    const existing = (await listItems()).find(
      (item) => item.kind === "starter" && item.title === reading.title,
    );
    const item =
      existing ??
      (await addItem({ title: reading.title, kind: "starter", text: reading.text }));
    router.push(`/read?id=${encodeURIComponent(item.id)}`);
  }

  const { levels, title, caption } = RANGES[range];
  const readings = levels.flatMap((level) => STARTER_READINGS.filter((r) => r.level === level));

  return (
    <Shelf
      title={title}
      caption={caption}
    >
      {readings.map((reading) => (
        <CoverTile
          key={reading.title}
          title={reading.title}
          badge={reading.level}
          subtitle="Graded reading"
          loading={loadingTitle === reading.title}
          disabled={loadingTitle !== null}
          onOpen={() => void open(reading)}
        />
      ))}
    </Shelf>
  );
}
