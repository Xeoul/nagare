import type { CSSProperties } from "react";

// A small, curated set of hues so generated art always looks deliberate:
// vermilion, amber, teal, sky, indigo, violet, rose.
const HUES = [8, 30, 168, 200, 226, 262, 332];

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

/** The character a cover or card is "about": its first kanji, else its first character. */
export function coverGlyph(text: string): string {
  return text.match(/[一-鿿々]/)?.[0] ?? text.match(/[぀-ヿ]/)?.[0] ?? text.trim().charAt(0);
}

/** Generated cover art for a book tile: two soft colour fields over a deep base. */
export function coverStyle(title: string): CSSProperties {
  const [a, b] = huePair(title);
  return {
    background: [
      `radial-gradient(120% 90% at 0% 0%, hsl(${a} 75% 58% / 0.95), transparent 62%)`,
      `radial-gradient(110% 90% at 100% 100%, hsl(${b} 70% 42% / 0.9), transparent 68%)`,
      `hsl(${a} 30% 12%)`,
    ].join(", "),
  };
}

/** The feed's full-screen backdrop: near-black with a faint coloured aura. */
export function auraStyle(text: string): CSSProperties {
  const [a, b] = huePair(text);
  return {
    background: [
      `radial-gradient(70% 45% at 90% 8%, hsl(${a} 80% 50% / 0.28), transparent 70%)`,
      `radial-gradient(80% 50% at 0% 100%, hsl(${b} 75% 45% / 0.22), transparent 70%)`,
      "#08080a",
    ].join(", "),
  };
}
