"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STARTER_READINGS, type StarterReading } from "@/data/starter-readings";
import { addItem, listItems } from "@/lib/library";
import CoverTile, { Shelf } from "./CoverTile";

const LEVEL_ORDER: StarterReading["level"][] = ["N5", "N4"];

export default function StarterShelf() {
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
    router.push(`/read/${item.id}`);
  }

  const readings = LEVEL_ORDER.flatMap((level) => STARTER_READINGS.filter((r) => r.level === level));

  return (
    <Shelf
      title="Starter readings"
      caption="Short originals written for Nagare, checked against JLPT word lists."
    >
      {readings.map((reading) => (
        <CoverTile
          key={reading.title}
          title={reading.title}
          badge={reading.level}
          subtitle="Starter reading"
          loading={loadingTitle === reading.title}
          disabled={loadingTitle !== null}
          onOpen={() => void open(reading)}
        />
      ))}
    </Shelf>
  );
}
