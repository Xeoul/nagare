export const AOZORA_BASE = "https://aozorahack.org/aozorabunko_text/";

export type ClassicWork = {
  title: string;
  author: string;
  /** Path relative to AOZORA_BASE, verified against the aozorahack mirror. */
  path: string;
  note: string;
  /**
   * Estimated JLPT reading level — computed by scripts/score-difficulty.mjs
   * from vocabulary coverage against jlpt-levels.json, not an official
   * grading (Aozora Bunko isn't learner material and carries no JLPT
   * tagging of its own). See NOTICE.md / README for the method.
   */
  level: "N3" | "N2";
  /** % of unique content words found in NO JLPT list at all (rounded). Higher = denser. */
  density: number;
};

/**
 * A hand-verified sample of Aozora Bunko (青空文庫) — Japan's public-domain
 * digital library. All from authors long enough out of copyright to be freely
 * redistributable (see https://www.aozora.gr.jp/guide/kijyunn.html). This is
 * native literary Japanese, not leveled reading: every title here scored N3
 * or N2 when run through the difficulty estimator, including a children's
 * story — real N5/N4 native reading essentially doesn't exist, which is
 * exactly why graded readers are a separate genre from literature.
 */
export const CLASSICS: ClassicWork[] = [
  {
    title: "蜘蛛の糸",
    author: "芥川龍之介",
    path: "cards/000879/files/92_ruby_164/92_ruby_164.txt",
    note: "Akutagawa — The Spider's Thread",
    level: "N3",
    density: 42,
  },
  {
    title: "羅生門",
    author: "芥川龍之介",
    path: "cards/000879/files/127_ruby_150/127_ruby_150.txt",
    note: "Akutagawa — Rashōmon",
    level: "N3",
    density: 46,
  },
  {
    title: "鼻",
    author: "芥川龍之介",
    path: "cards/000879/files/42_ruby_154/42_ruby_154.txt",
    note: "Akutagawa — The Nose",
    level: "N3",
    density: 44,
  },
  {
    title: "杜子春",
    author: "芥川龍之介",
    path: "cards/000879/files/43015_ruby_17393/43015_ruby_17393.txt",
    note: "Akutagawa — Toshishun",
    level: "N3",
    density: 46,
  },
  {
    title: "夢十夜",
    author: "夏目漱石",
    path: "cards/000148/files/799_ruby_6024/799_ruby_6024.txt",
    note: "Sōseki — Ten Nights of Dreams",
    level: "N2",
    density: 48,
  },
  {
    title: "注文の多い料理店",
    author: "宮沢賢治",
    path: "cards/000081/files/43754_ruby_17594/43754_ruby_17594.txt",
    note: "Miyazawa — The Restaurant of Many Orders",
    level: "N3",
    density: 50,
  },
  {
    title: "やまなし",
    author: "宮沢賢治",
    path: "cards/000081/files/46605_ruby_29758/46605_ruby_29758.txt",
    note: "Miyazawa — Wild Pear",
    level: "N3",
    density: 49,
  },
  {
    title: "銀河鉄道の夜",
    author: "宮沢賢治",
    path: "cards/000081/files/456_ruby_145/456_ruby_145.txt",
    note: "Miyazawa — Night on the Galactic Railroad",
    level: "N3",
    density: 56,
  },
  {
    title: "走れメロス",
    author: "太宰治",
    path: "cards/000035/files/1567_ruby_4948/1567_ruby_4948.txt",
    note: "Dazai — Run, Melos!",
    level: "N2",
    density: 50,
  },
  {
    title: "ごん狐",
    author: "新美南吉",
    path: "cards/000121/files/628_ruby_649/628_ruby_649.txt",
    note: "Niimi — Gon, the Fox",
    level: "N3",
    density: 61,
  },
  {
    title: "山月記",
    author: "中島敦",
    path: "cards/000119/files/624_ruby_5668/624_ruby_5668.txt",
    note: "Nakajima — The Moon Over the Mountain",
    level: "N3",
    density: 55,
  },
  {
    title: "高瀬舟",
    author: "森鴎外",
    path: "cards/000129/files/45245_ruby_21882/45245_ruby_21882.txt",
    note: "Mori Ōgai — The Boat on the Takase River",
    level: "N3",
    density: 45,
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
