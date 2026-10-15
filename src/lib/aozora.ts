import { assetUrl } from "@/lib/base-path";

export const AOZORA_BASE = "https://aozorahack.org/aozorabunko_text/";

export type ClassicWork = {
  title: string;
  author: string;
  /** Path relative to AOZORA_BASE, verified against the aozorahack mirror. */
  path: string;
  /** Matches the file at public/classics/<slug>.txt — see scripts/fetch-classics.mjs. */
  slug: string;
  note: string;
  /**
   * Estimated JLPT reading level — computed by scripts/score-difficulty.mjs
   * from vocabulary coverage against jlpt-levels.json, not an official
   * grading (Aozora Bunko isn't learner material and carries no JLPT
   * tagging of its own). See NOTICE.md / README for the method.
   */
  level: "N3" | "N2" | "N1";
  /** A full-length book, read a chapter at a time and kept out of the feed. */
  novel?: boolean;
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
    slug: "kumo-no-ito",
    note: "Akutagawa — The Spider's Thread",
    level: "N3",
    density: 42,
  },
  {
    title: "羅生門",
    author: "芥川龍之介",
    path: "cards/000879/files/127_ruby_150/127_ruby_150.txt",
    slug: "rashomon",
    note: "Akutagawa — Rashōmon",
    level: "N3",
    density: 46,
  },
  {
    title: "鼻",
    author: "芥川龍之介",
    path: "cards/000879/files/42_ruby_154/42_ruby_154.txt",
    slug: "hana",
    note: "Akutagawa — The Nose",
    level: "N3",
    density: 44,
  },
  {
    title: "杜子春",
    author: "芥川龍之介",
    path: "cards/000879/files/43015_ruby_17393/43015_ruby_17393.txt",
    slug: "toshishun",
    note: "Akutagawa — Toshishun",
    level: "N3",
    density: 46,
  },
  {
    title: "夢十夜",
    author: "夏目漱石",
    path: "cards/000148/files/799_ruby_6024/799_ruby_6024.txt",
    slug: "yumejuya",
    note: "Sōseki — Ten Nights of Dreams",
    level: "N2",
    density: 48,
  },
  {
    title: "注文の多い料理店",
    author: "宮沢賢治",
    path: "cards/000081/files/43754_ruby_17594/43754_ruby_17594.txt",
    slug: "chumon-no-oi-ryoriten",
    note: "Miyazawa — The Restaurant of Many Orders",
    level: "N3",
    density: 50,
  },
  {
    title: "やまなし",
    author: "宮沢賢治",
    path: "cards/000081/files/46605_ruby_29758/46605_ruby_29758.txt",
    slug: "yamanashi",
    note: "Miyazawa — Wild Pear",
    level: "N3",
    density: 49,
  },
  {
    title: "銀河鉄道の夜",
    author: "宮沢賢治",
    path: "cards/000081/files/456_ruby_145/456_ruby_145.txt",
    slug: "ginga-tetsudo-no-yoru",
    note: "Miyazawa — Night on the Galactic Railroad",
    level: "N3",
    density: 56,
  },
  {
    title: "走れメロス",
    author: "太宰治",
    path: "cards/000035/files/1567_ruby_4948/1567_ruby_4948.txt",
    slug: "hashire-merosu",
    note: "Dazai — Run, Melos!",
    level: "N2",
    density: 50,
  },
  {
    title: "ごん狐",
    author: "新美南吉",
    path: "cards/000121/files/628_ruby_649/628_ruby_649.txt",
    slug: "gongitsune",
    note: "Niimi — Gon, the Fox",
    level: "N3",
    density: 61,
  },
  {
    title: "山月記",
    author: "中島敦",
    path: "cards/000119/files/624_ruby_5668/624_ruby_5668.txt",
    slug: "sangetsuki",
    note: "Nakajima — The Moon Over the Mountain",
    level: "N3",
    density: 55,
  },
  {
    title: "高瀬舟",
    author: "森鴎外",
    path: "cards/000129/files/45245_ruby_21882/45245_ruby_21882.txt",
    slug: "takasebune",
    note: "Mori Ōgai — The Boat on the Takase River",
    level: "N3",
    density: 45,
  },
  {
    title: "手袋を買いに",
    author: "新美南吉",
    path: "cards/000121/files/637_ruby_4095/637_ruby_4095.txt",
    slug: "tebukuro-wo-kai-ni",
    note: "Niimi — Buying Mittens",
    level: "N3",
    density: 50,
  },
  {
    title: "赤い蝋燭と人魚",
    author: "小川未明",
    path: "cards/001475/files/54372_ruby_46181/54372_ruby_46181.txt",
    slug: "akai-rosoku-to-ningyo",
    note: "Ogawa — The Red Candles and the Mermaid",
    level: "N3",
    density: 39,
  },
  {
    title: "雪渡り",
    author: "宮沢賢治",
    path: "cards/000081/files/45679_ruby_21992/45679_ruby_21992.txt",
    slug: "yukiwatari",
    note: "Miyazawa — Snow Crossing",
    level: "N3",
    density: 48,
  },
  {
    title: "セロ弾きのゴーシュ",
    author: "宮沢賢治",
    path: "cards/000081/files/470_ruby_3987/470_ruby_3987.txt",
    slug: "sero-hiki-no-goshu",
    note: "Miyazawa — Gauche the Cellist",
    level: "N3",
    density: 55,
  },
  {
    title: "よだかの星",
    author: "宮沢賢治",
    path: "cards/000081/files/473_ruby_467/473_ruby_467.txt",
    slug: "yodaka-no-hoshi",
    note: "Miyazawa — The Nighthawk Star",
    level: "N3",
    density: 52,
  },
  {
    title: "風の又三郎",
    author: "宮沢賢治",
    path: "cards/000081/files/462_ruby_716/462_ruby_716.txt",
    slug: "kaze-no-matasaburo",
    note: "Miyazawa — Matasaburō of the Wind",
    level: "N3",
    density: 59,
  },
  {
    title: "トロッコ",
    author: "芥川龍之介",
    path: "cards/000879/files/43016_ruby_16663/43016_ruby_16663.txt",
    slug: "torokko",
    note: "Akutagawa — The Handcart",
    level: "N3",
    density: 43,
  },
  {
    title: "蜜柑",
    author: "芥川龍之介",
    path: "cards/000879/files/43017_ruby_17394/43017_ruby_17394.txt",
    slug: "mikan",
    note: "Akutagawa — Tangerines",
    level: "N3",
    density: 46,
  },
  {
    title: "魔術",
    author: "芥川龍之介",
    path: "cards/000879/files/95_ruby_885/95_ruby_885.txt",
    slug: "majutsu",
    note: "Akutagawa — Magic",
    level: "N3",
    density: 45,
  },
  {
    title: "白",
    author: "芥川龍之介",
    path: "cards/000879/files/149_ruby_1581/149_ruby_1581.txt",
    slug: "shiro",
    note: "Akutagawa — Shiro the Dog",
    level: "N3",
    density: 45,
  },
  {
    title: "桃太郎",
    author: "芥川龍之介",
    path: "cards/000879/files/100_ruby_1154/100_ruby_1154.txt",
    slug: "momotaro-akutagawa",
    note: "Akutagawa — his retelling of Momotarō",
    level: "N3",
    density: 47,
  },
  {
    title: "檸檬",
    author: "梶井基次郎",
    path: "cards/000074/files/424_ruby_19825/424_ruby_19825.txt",
    slug: "remon",
    note: "Kajii — Lemon",
    level: "N2",
    density: 46,
  },
  {
    title: "葉桜と魔笛",
    author: "太宰治",
    path: "cards/000035/files/42376_ruby_15517/42376_ruby_15517.txt",
    slug: "hazakura-to-mateki",
    note: "Dazai — Cherry Leaves and the Whistler",
    level: "N3",
    density: 46,
  },
  {
    title: "一房の葡萄",
    author: "有島武郎",
    path: "cards/000025/files/211_ruby_20471/211_ruby_20471.txt",
    slug: "hitofusa-no-budo",
    note: "Arishima — A Bunch of Grapes",
    level: "N3",
    density: 41,
  },
  {
    title: "河童",
    author: "芥川龍之介",
    path: "cards/000879/files/69_ruby_1321/69_ruby_1321.txt",
    slug: "kappa",
    note: "Akutagawa — Kappa (novella)",
    level: "N2",
    density: 49,
    novel: true,
  },
  {
    title: "坊っちゃん",
    author: "夏目漱石",
    path: "cards/000148/files/752_ruby_2438/752_ruby_2438.txt",
    slug: "botchan",
    note: "Sōseki — Botchan",
    level: "N2",
    density: 59,
    novel: true,
  },
  {
    title: "人間失格",
    author: "太宰治",
    path: "cards/000035/files/301_ruby_5915/301_ruby_5915.txt",
    slug: "ningen-shikkaku",
    note: "Dazai — No Longer Human",
    level: "N2",
    density: 57,
    novel: true,
  },
  {
    title: "斜陽",
    author: "太宰治",
    path: "cards/000035/files/1565_ruby_8220/1565_ruby_8220.txt",
    slug: "shayo",
    note: "Dazai — The Setting Sun",
    level: "N2",
    density: 58,
    novel: true,
  },
  {
    title: "三四郎",
    author: "夏目漱石",
    path: "cards/000148/files/794_ruby_4237/794_ruby_4237.txt",
    slug: "sanshiro",
    note: "Sōseki — Sanshirō",
    level: "N2",
    density: 58,
    novel: true,
  },
  {
    title: "こころ",
    author: "夏目漱石",
    path: "cards/000148/files/773_ruby_5968/773_ruby_5968.txt",
    slug: "kokoro",
    note: "Sōseki — Kokoro",
    level: "N2",
    density: 55,
    novel: true,
  },
  {
    title: "吾輩は猫である",
    author: "夏目漱石",
    path: "cards/000148/files/789_ruby_5639/789_ruby_5639.txt",
    slug: "wagahai-wa-neko-de-aru",
    note: "Sōseki — I Am a Cat",
    level: "N1",
    density: 71,
    novel: true,
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
    // Chapter headings become "§ heading" marker lines (src/lib/chapters.ts)
    // so long works can be read a chapter at a time.
    .map((line) => {
      const heading = line.match(/［＃「([^」]+)」は[大中]見出し］/);
      return heading ? `§ ${heading[1].replace(/\s+/g, " ")}` : line;
    })
    .join("\n")
    .replace(/［＃[^］]*］/g, "")
    .replace(/｜/g, "")
    .replace(/《[^》]*》/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Reads pre-fetched, already-stripped text bundled at public/classics/<slug>.txt
 * (see scripts/fetch-classics.mjs) instead of fetching Aozora Bunko live —
 * opening a classic is then instant rather than waiting on an external site.
 * Falls back to a live fetch if the bundled file is ever missing.
 */
export async function fetchClassicText(work: ClassicWork): Promise<string> {
  const bundled = await fetch(assetUrl(`/classics/${work.slug}.txt`));
  if (bundled.ok) return bundled.text();

  const res = await fetch(AOZORA_BASE + work.path);
  if (!res.ok) {
    throw new Error(`Couldn't reach Aozora Bunko (${res.status}). Try again in a moment.`);
  }
  const buffer = await res.arrayBuffer();
  const raw = new TextDecoder("shift_jis").decode(buffer);
  return stripAozoraMarkup(raw);
}
