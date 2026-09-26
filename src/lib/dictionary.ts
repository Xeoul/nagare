export type JmdictEntry = {
  reading: string;
  pos: string;
  meanings: string[];
  level?: string;
};
/**
 * Kana keys can hold several ranked candidates (もの is both a particle and
 * 物, くる both 来る and 繰る) — see scripts/build-dictionary.mjs. pickEntry
 * chooses between them.
 */
export type JmdictLookup = Record<string, JmdictEntry | JmdictEntry[]>;

/** The grammar the tokenizer knows about a word, used to choose between homographs. */
export type TokenGrammar = {
  pos: string;
  pos_detail_1: string;
  conjugated_type: string;
  basic_form?: string;
  surface_form?: string;
  /** Katakana, for the surface form as written. */
  reading?: string;
};

const toHiragana = (text: string) =>
  text.replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));

// kuromoji tags the nominalizing の/ん (だれのですか, 行くんです) as a
// dependent noun, but JMdict files that use under the particle.
const NOMINALIZERS = new Set(["の", "ん"]);

let jmdictPromise: Promise<JmdictLookup | null> | null = null;

/**
 * Lazily fetches the bundled JMdict-derived "common words" lookup (see
 * scripts/build-dictionary.mjs and NOTICE.md for how it's built and
 * licensed) — ~22k entries, each carrying a JLPT level tag where
 * scripts/build-jlpt-levels.mjs's word list has one. Cached in memory after
 * the first load, same pattern as the tokenizer's dictionary. Resolves to
 * null on failure so a flaky network doesn't break reading, just lookups.
 */
export function loadDictionary(): Promise<JmdictLookup | null> {
  if (!jmdictPromise) {
    jmdictPromise = fetch("/dictionary/jmdict-common.json")
      .then((res) => {
        if (!res.ok) throw new Error(`Dictionary fetch failed: ${res.status}`);
        return res.json() as Promise<JmdictLookup>;
      })
      .catch((err) => {
        console.error("Couldn't load the dictionary", err);
        return null;
      });
  }
  return jmdictPromise;
}

// What each kuromoji part of speech looks like in JMdict's pos text.
const POS_MATCH: Record<string, RegExp> = {
  動詞: /verb/,
  形容詞: /adjective \(keiyoushi\)/,
  名詞: /noun|pronoun/,
  連体詞: /pre-noun adjectival/,
  副詞: /adverb/,
  助詞: /particle/,
  助動詞: /auxiliary|copula/,
  接続詞: /conjunction/,
  感動詞: /interjection/,
  フィラー: /interjection/,
};

// Verb conjugation classes: kuromoji's conjugated_type prefix -> JMdict's wording.
const CONJUGATION_MATCH: [string, RegExp][] = [
  ["五段", /Godan/],
  ["一段", /Ichidan/],
  ["カ変", /Kuru verb/],
  ["サ変", /suru verb/],
];

function score(entry: JmdictEntry, grammar: TokenGrammar): number {
  let total = 0;
  // The reading settles kanji homographs outright (本: ほん "book" vs もと
  // "origin"). Only trusted for uninflected tokens, since kuromoji's reading
  // is of the surface form (行っ is イッ, not いく).
  if (
    grammar.reading &&
    grammar.surface_form === grammar.basic_form &&
    toHiragana(grammar.reading) === entry.reading
  ) {
    total += 4;
  }
  if (POS_MATCH[grammar.pos]?.test(entry.pos)) total += 2;
  if (grammar.pos_detail_1 === "代名詞" && /pronoun/.test(entry.pos)) total += 1;
  // Suffixes and numbers are nouns to kuromoji, so the noun match alone
  // would pick たち "long sword" in すずめたち or さん "Mr" for 3.
  if (grammar.pos_detail_1 === "接尾" && /suffix/.test(entry.pos)) total += 3;
  if (grammar.pos_detail_1 === "数" && /numeric/.test(entry.pos)) total += 3;
  if (
    grammar.pos_detail_1 === "非自立" &&
    NOMINALIZERS.has(grammar.basic_form ?? "") &&
    /particle/.test(entry.pos)
  ) {
    total += 3;
  }
  const conjugation = CONJUGATION_MATCH.find(([prefix]) => grammar.conjugated_type.startsWith(prefix));
  if (conjugation?.[1].test(entry.pos)) total += 1;
  return total;
}

/** Picks the candidate whose grammar fits the token best, falling back to the build's ranking. */
export function pickEntry(
  value: JmdictEntry | JmdictEntry[] | undefined,
  grammar?: TokenGrammar,
): JmdictEntry | null {
  if (!value) return null;
  if (!Array.isArray(value)) return value;
  if (!grammar) return value[0];
  let best = value[0];
  let bestScore = score(best, grammar);
  for (const candidate of value.slice(1)) {
    const candidateScore = score(candidate, grammar);
    if (candidateScore > bestScore) {
      best = candidate;
      bestScore = candidateScore;
    }
  }
  return best;
}

export function lookupDictionary(
  basicForm: string,
  surfaceForm: string,
  jmdict: JmdictLookup | null,
  grammar?: TokenGrammar,
): JmdictEntry | null {
  return pickEntry(jmdict?.[basicForm], grammar) ?? pickEntry(jmdict?.[surfaceForm], grammar);
}
