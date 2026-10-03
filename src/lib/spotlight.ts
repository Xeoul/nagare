import { lookupDictionary, pickEntry, type JmdictEntry, type JmdictLookup } from "./dictionary";
import { hasKanji } from "./furigana";
import { lookupKey, type Token } from "./tokenizer";

const CONTENT_POS = new Set(["名詞", "動詞", "形容詞", "副詞"]);
const SKIP_POS_DETAIL = new Set(["非自立", "数", "代名詞", "接尾"]);
const TOO_COMMON = new Set(["する", "ある", "いる", "なる", "いう", "できる", "くる", "来る", "こと", "もの", "よう", "とき"]);

export type Spotlight = { token: Token; index: number; key: string; entry: JmdictEntry };

/** The word a spotlight or quiz card features: a content word the dictionary knows, preferring ones with kanji. */
export function pickSpotlight(
  tokens: Token[],
  dictionary: JmdictLookup | null,
  seed: number,
): Spotlight | null {
  const candidates = tokens
    .map((token, index) => ({ token, index, key: lookupKey(token) }))
    .filter(
      (c) =>
        CONTENT_POS.has(c.token.pos) &&
        !SKIP_POS_DETAIL.has(c.token.pos_detail_1) &&
        !TOO_COMMON.has(c.key),
    )
    .map((c) => ({ ...c, entry: lookupDictionary(c.key, c.token.surface_form, dictionary, c.token) }))
    .filter((c): c is typeof c & { entry: JmdictEntry } => Boolean(c.entry?.meanings.length));
  if (candidates.length === 0) return null;
  const withKanji = candidates.filter((c) => hasKanji(c.key));
  const pool = withKanji.length > 0 ? withKanji : candidates;
  return pool[seed % pool.length];
}

/** The short gloss a quiz shows for an entry: its first meaning, minus any parenthetical. */
export function gloss(entry: Pick<JmdictEntry, "meanings">): string {
  const first = entry.meanings[0] ?? "";
  const trimmed = first.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  return trimmed || first;
}

type PoolEntry = { key: string; entry: JmdictEntry; family: string };

/** Broad word class, so wrong answers are the same kind of word as the right one. */
function family(pos: string): string {
  if (/verb/.test(pos) && !/adverb/.test(pos)) return "verb";
  if (/adjective/.test(pos)) return "adjective";
  if (/adverb/.test(pos)) return "adverb";
  return "noun";
}

const pools = new WeakMap<JmdictLookup, PoolEntry[]>();

/** Common, JLPT-tagged words to draw wrong answers from (built once per dictionary). */
function distractorPool(dictionary: JmdictLookup): PoolEntry[] {
  let pool = pools.get(dictionary);
  if (!pool) {
    pool = [];
    for (const [key, value] of Object.entries(dictionary)) {
      const entry = pickEntry(value);
      if (!entry?.level || !hasKanji(key) || entry.meanings.length === 0) continue;
      if (!/^N[345]$/.test(entry.level)) continue;
      pool.push({ key, entry, family: family(entry.pos) });
    }
    pools.set(dictionary, pool);
  }
  return pool;
}

function seeded(seed: number) {
  let state = seed % 2147483647 || 1;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

export type Quiz = { options: string[]; answer: number };

/**
 * Four English meanings — the right one plus three wrong ones of the same
 * word class and similar level — in an order fixed by the seed, so a card
 * looks the same if you scroll away and back.
 */
export function buildQuiz(
  target: { key: string; entry: Pick<JmdictEntry, "meanings" | "pos" | "level"> },
  dictionary: JmdictLookup,
  seed: number,
): Quiz | null {
  const random = seeded(seed);
  const right = gloss(target.entry);
  const targetFamily = family(target.entry.pos);
  const pool = distractorPool(dictionary);
  const sameFamily = pool.filter((p) => p.family === targetFamily);
  const source = sameFamily.length >= 20 ? sameFamily : pool;
  const preferred = source.filter((p) => p.entry.level === target.entry.level);
  const draw = preferred.length >= 20 ? preferred : source;

  const wrong = new Set<string>();
  for (let tries = 0; wrong.size < 3 && tries < 60; tries++) {
    const pick = draw[Math.floor(random() * draw.length)];
    if (!pick || pick.key === target.key) continue;
    const option = gloss(pick.entry);
    if (option.toLowerCase() === right.toLowerCase()) continue;
    if (target.entry.meanings.some((m) => m.toLowerCase() === option.toLowerCase())) continue;
    wrong.add(option);
  }
  if (wrong.size < 3) return null;

  const options = [...wrong];
  const answer = Math.floor(random() * 4);
  options.splice(answer, 0, right);
  return { options, answer };
}
