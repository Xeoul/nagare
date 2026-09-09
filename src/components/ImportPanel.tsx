"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addItem } from "@/lib/library";
import { parseImportedFile } from "@/lib/importFile";

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
      router.push(`/read/${item.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't import that file.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div>
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
        className={`flex flex-col items-center justify-center gap-2 rounded border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer ${
          isDragging ? "border-accent bg-paper-raised" : "border-line"
        }`}
      >
        <span className="text-sm font-medium">
          {isImporting ? "Importing…" : "Drop a .txt or .epub file here"}
        </span>
        <span className="text-xs text-ink-soft">or click to choose a file</span>
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
