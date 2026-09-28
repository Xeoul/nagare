"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addItem } from "@/lib/library";
import { parseImportedFile } from "@/lib/importFile";
import { PlusIcon } from "./icons";

export default function ImportPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setIsImporting(true);
    try {
      const parsed = await parseImportedFile(file);
      const item = await addItem(parsed);
      router.push(`/read?id=${encodeURIComponent(item.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't import that file.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="px-5">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        className={`card card-interactive flex cursor-pointer items-center gap-4 px-4 py-3.5 ${
          isDragging ? "ring-2 ring-ink/30" : ""
        }`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper-sunk text-ink">
          <PlusIcon className="h-5 w-5" strokeWidth={2.4} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">
            {isImporting ? "Importing…" : "Import your own"}
          </span>
          <span className="block text-xs text-ink-soft">A .txt or .epub file, tap or drop</span>
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.epub"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
      </label>
      {error && <p className="mt-2 text-sm text-accent-warm">{error}</p>}
    </div>
  );
}
