import type { CSSProperties } from "react";

// A small, curated set of hues, always heavily desaturated so covers read
// as soft tones rather than colours: clay, sand, sage, slate, dusk, plum.
const HUES = [14, 36, 150, 205, 232, 280];

export function hashText(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function huePair(text: string): [number, number] {
  const h = hashText(text);
  const first = HUES[h % HUES.length];
  const second = HUES[(h >> 3) % HUES.length];
  return [first, second === first ? (first + 40) % 360 : second];
}

/** Generated cover art for a book tile: a muted tone with a gentle sheen. */
export function coverStyle(title: string): CSSProperties {
  const [a] = huePair(title);
  return { background: `linear-gradient(160deg, hsl(${a} 9% 40%), hsl(${a} 8% 24%))` };
}

