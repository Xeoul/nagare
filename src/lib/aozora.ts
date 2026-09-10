export const AOZORA_BASE = "https://aozorahack.org/aozorabunko_text/";

export type ClassicWork = {
  title: string;
  author: string;
  /** Path relative to AOZORA_BASE, verified against the aozorahack mirror. */
  path: string;
  note: string;
};

/**
 * A small, hand-verified sample of Aozora Bunko (青空文庫) — Japan's public-domain
 * digital library. All from authors long enough out of copyright to be freely
 * redistributable (see https://www.aozora.gr.jp/guide/kijyunn.html). This is
 * native literary Japanese, not leveled reading — expect roughly N2+.
 */
export const CLASSICS: ClassicWork[] = [
  {
    title: "蜘蛛の糸",
    author: "芥川龍之介",
    path: "cards/000879/files/92_ruby_164/92_ruby_164.txt",
    note: "Akutagawa — The Spider's Thread",
  },
  {
    title: "羅生門",
    author: "芥川龍之介",
    path: "cards/000879/files/127_ruby_150/127_ruby_150.txt",
    note: "Akutagawa — Rashōmon",
  },
  {
    title: "鼻",
    author: "芥川龍之介",
    path: "cards/000879/files/42_ruby_154/42_ruby_154.txt",
    note: "Akutagawa — The Nose",
  },
  {
    title: "杜子春",
    author: "芥川龍之介",
    path: "cards/000879/files/43015_ruby_17393/43015_ruby_17393.txt",
    note: "Akutagawa — Toshishun",
  },
  {
    title: "夢十夜",
    author: "夏目漱石",
    path: "cards/000148/files/799_ruby_6024/799_ruby_6024.txt",
    note: "Sōseki — Ten Nights of Dreams",
  },
];

/**
 * Aozora's plain-text format wraps the body in a symbol legend (top) and a
 * bibliographic footer (bottom, starting with "底本："), and marks up ruby
 * (furigana) as ｜kanji《reading》 plus ［＃editorial notes］ throughout. We
 * strip all of that down to plain text — Nagare supplies its own readings
 * via the dictionary/tokenizer, so baked-in furigana isn't needed here.
 */
export function stripAozoraMarkup(raw: string): string {
  const lines = raw.split(/\r\n|\r|\n/);

  const dashLineIndices: number[] = [];
  lines.forEach((line, i) => {
    if (/^-{10,}$/.test(line.trim())) dashLineIndices.push(i);
  });
  const start = dashLineIndices.length >= 2 ? dashLineIndices[1] + 1 : 0;

  let end = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^底本[：:]/.test(lines[i].trim())) {
      end = i;
      break;
    }
  }

  return lines
    .slice(start, end)
    .join("\n")
    .replace(/［＃[^］]*］/g, "")
    .replace(/｜/g, "")
    .replace(/《[^》]*》/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function fetchClassicText(work: ClassicWork): Promise<string> {
  const res = await fetch(AOZORA_BASE + work.path);
  if (!res.ok) {
    throw new Error(`Couldn't reach Aozora Bunko (${res.status}). Try again in a moment.`);
  }
  const buffer = await res.arrayBuffer();
  const raw = new TextDecoder("shift_jis").decode(buffer);
  return stripAozoraMarkup(raw);
}
