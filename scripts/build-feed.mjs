// Builds public/feed/content.json — everything the feed shows — from the
// hand-written lessons in content/ (words, grammar, facts, stories).
//
// Every Japanese sentence is tokenized here, at build time, with kuromoji,
// and shipped pre-split with furigana and a tap-to-see gloss per word.
// That way the phone never downloads the ~17MB tokenizer dictionary or the
// full ~22k-entry JMdict — just the few hundred KB it actually shows.
//
// Glosses prefer the hand-written word list (content/words.json), then a
// small particle/ending table below, then JMdict (data/dictionary). JMdict
// lookups are sanity-checked against the tokenizer's reading, because the
// extract keys entries by surface form and some kana keys collide with the
// wrong word (ここ used to resolve to "nine"; 本 to もと instead of ほん).
//
// Usage: npm run build:feed

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import kuromoji from "kuromoji";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf-8"));

const words = read("content/words.json");
const grammar = read("content/grammar.json");
const facts = read("content/facts.json");
const stories = read("content/stories.json");
const jmdict = read("data/dictionary/jmdict-common.json");

// Function words kuromoji splits out on their own. JMdict either lacks
// these or describes them too abstractly to help on a flashcard.
const FUNCTION_WORDS = {
  は: { r: "は (wa)", m: "topic marker — \"as for…\"", p: "particle" },
  が: { r: "が", m: "subject marker; \"but\" between clauses", p: "particle" },
  を: { r: "を (o)", m: "marks the direct object", p: "particle" },
  に: { r: "に", m: "to; at (a time); in/on (existence)", p: "particle" },
  で: { r: "で", m: "at (where an action happens); by means of", p: "particle" },
  へ: { r: "へ (e)", m: "toward; to (a direction)", p: "particle" },
  と: { r: "と", m: "and (complete list); with; quotation marker", p: "particle" },
  も: { r: "も", m: "also; too; even", p: "particle" },
  の: { r: "の", m: "'s; of (links nouns); explanatory ending", p: "particle" },
  か: { r: "か", m: "question marker; or", p: "particle" },
  ね: { r: "ね", m: "right? isn't it? (seeks agreement)", p: "particle" },
  よ: { r: "よ", m: "you know! (tells something new)", p: "particle" },
  から: { r: "から", m: "from; because", p: "particle" },
  まで: { r: "まで", m: "until; as far as", p: "particle" },
  や: { r: "や", m: "and (partial list — among other things)", p: "particle" },
  より: { r: "より", m: "than; from", p: "particle" },
  ので: { r: "ので", m: "because; so (softer than から)", p: "particle" },
  けど: { r: "けど", m: "but; although", p: "particle" },
  ます: { r: "ます", m: "polite verb ending", p: "ending" },
  です: { r: "です", m: "polite \"is / am / are\"", p: "ending" },
  た: { r: "た", m: "past-tense ending", p: "ending" },
  だ: { r: "だ", m: "plain \"is\" (casual です)", p: "ending" },
  ない: { r: "ない", m: "negative ending — \"not\"", p: "ending" },
  ぬ: { r: "ん", m: "negative ending (as in ません)", p: "ending" },
  て: { r: "て", m: "te-form connector — \"and then\"", p: "ending" },
  たい: { r: "たい", m: "want to (do)", p: "ending" },
  う: { r: "う", m: "volitional ending — \"let's\" (as in ましょう)", p: "ending" },
};

function toHiragana(text) {
  return text.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

const KANJI = /[一-鿿㐀-䶿々]/;

// Mirrors the old reader's src/lib/furigana.ts: split a token into leading
// kana + kanji core + trailing okurigana so the reading sits only over the
// kanji (食べる → 食 gets た, べる stays plain).
function furigana(surface, readingKatakana) {
  if (!KANJI.test(surface) || !readingKatakana || readingKatakana === "*") return undefined;
  const reading = toHiragana(readingKatakana);
  let end = surface.length;
  let readEnd = reading.length;
  while (end > 0 && readEnd > 0 && surface[end - 1] === reading[readEnd - 1] && !KANJI.test(surface[end - 1])) {
    end--;
    readEnd--;
  }
  let start = 0;
  let readStart = 0;
  while (start < end && readStart < readEnd && surface[start] === reading[readStart] && !KANJI.test(surface[start])) {
    start++;
    readStart++;
  }
  const kanji = surface.slice(start, end);
  const r = reading.slice(readStart, readEnd);
  if (!kanji || !r || kanji === r) return undefined;
  return [surface.slice(0, start), kanji, r, surface.slice(end)];
}

function shortPos(pos) {
  if (/^(Ichidan|Godan|Kuru|Suru)|verb/.test(pos) && !/^noun/.test(pos)) return "verb";
  if (/adjective \(keiyoushi\)/.test(pos)) return "i-adj";
  if (/^adjectival nouns/.test(pos)) return "na-adj";
  if (/^adverb/.test(pos)) return "adverb";
  if (/^expressions/.test(pos)) return "expression";
  if (/^interjection/.test(pos)) return "interjection";
  if (/^pronoun/.test(pos)) return "pronoun";
  if (/^numeric/.test(pos)) return "number";
  if (/^counter/.test(pos)) return "counter";
  if (/^particle/.test(pos)) return "particle";
  return "noun";
}

const INFLECTING = new Set(["動詞", "形容詞"]);

const glossary = {};
const authored = new Map(words.map((w) => [w.key, w]));

function glossFor(token) {
  const key = token.basic_form && token.basic_form !== "*" ? token.basic_form : token.surface_form;
  if (typeof token.fixed === "object" && !authored.has(key)) {
    glossary[key] ??= token.fixed;
    return key;
  }

  const word = authored.get(key) ?? authored.get(token.surface_form);
  if (word && readingMatches(word, token)) {
    glossary[word.key] ??= { r: word.reading, m: word.meaning, p: word.pos, l: word.level };
    return word.key;
  }

  if (token.pos === "助詞" || token.pos === "助動詞") {
    if (FUNCTION_WORDS[key]) {
      glossary[key] ??= FUNCTION_WORDS[key];
      return key;
    }
    return undefined;
  }
  if (token.pos === "記号") return undefined;

  const entry = jmdict[key] ?? jmdict[token.surface_form];
  if (!entry) return undefined;
  const entryReading = toHiragana(entry.reading);
  const tokenReading = toHiragana(token.reading ?? "");
  // Inflected forms don't share a full reading with the dictionary form, so
  // only compare the first mora there; everything else has to match exactly.
  const plausible = INFLECTING.has(token.pos)
    ? tokenReading && entryReading[0] === tokenReading[0]
    : !tokenReading || tokenReading === entryReading;
  if (!plausible) return undefined;

  glossary[key] ??= {
    r: entryReading,
    m: entry.meanings.slice(0, 3).join("; "),
    p: shortPos(entry.pos),
    ...(entry.level ? { l: entry.level } : {}),
  };
  return key;
}

const CONJUGATING = new Set(["verb", "i-adj"]);

/**
 * Whether a hand-written word is really the token in front of us: a kanji
 * like 人 is ひと alone but にん in 三人, and only the first is the word we
 * wrote the gloss for. Conjugating words can't be compared this way (their
 * surface reading changes), so they're trusted by dictionary form.
 */
function readingMatches(word, token) {
  if (CONJUGATING.has(word.pos) || !token.reading || token.reading === "*") return true;
  const tokenReading = toHiragana(token.reading);
  return word.reading.split("・").some((r) => r === tokenReading);
}

// Readings kuromoji gets wrong in this content, pinned by hand. It reads
// 日本 as にっぽん, time words digit by digit (九時 → きゅうじ, not くじ),
// and picks the wrong one of two verbs for 降り/開い. `lemma` corrects the
// dictionary form too, so the tap-gloss is for the right word.
const PHRASES = [
  { key: "日本", reading: "にほん" },
  { key: "日本人", reading: "にほんじん", gloss: { m: "Japanese person", p: "noun" } },
  { key: "七時", reading: "しちじ", gloss: { m: "seven o'clock", p: "noun" } },
  { key: "九時", reading: "くじ", gloss: { m: "nine o'clock", p: "noun" } },
  { key: "四人", reading: "よにん", gloss: { m: "four people", p: "counter" } },
  { key: "十皿", reading: "じゅっさら", gloss: { m: "ten plates", p: "counter" } },
  { key: "二十四時間", reading: "にじゅうよじかん", gloss: { m: "24 hours", p: "noun" } },
  { key: "四月一日", reading: "しがつついたち", gloss: { m: "April 1st", p: "noun" } },
  { key: "後で", reading: "あとで", gloss: { m: "after; later", p: "adverb" } },
  { key: "何回", reading: "なんかい", gloss: { m: "how many times", p: "noun" } },
  { key: "何時", reading: "なんじ", gloss: { m: "what time", p: "noun" } },
  { key: "辛い", reading: "からい", gloss: { m: "spicy; hot", p: "i-adj" } },
  { key: "角", reading: "かど", gloss: { m: "corner", p: "noun" } },
  { key: "下", reading: "した" },
  { key: "寒", reading: "さむ", lemma: "寒い" },
  { key: "降り", reading: "ふり", lemma: "降る" },
  { key: "開い", reading: "あい", lemma: "開く", gloss: { r: "あく", m: "to open; to be open", p: "verb" } },
];

// Plus fixed multi-token words from the word list (一人, 一緒に,
// お願いします…) — kuromoji splits some of these, and reads 一人 as
// いち+にん — so they're re-joined into one token with the hand-written
// reading. Longest first, so 四月一日 wins over 一日.
const FIXED = [
  ...PHRASES,
  ...words.filter((w) => w.key.length > 1 && !CONJUGATING.has(w.pos) && !w.reading.includes("・")),
].sort((a, b) => b.key.length - a.key.length);

function applyFixedReadings(tokens, text) {
  for (const fixed of FIXED) {
    let from = 0;
    let at;
    while ((at = text.indexOf(fixed.key, from)) >= 0) {
      from = at + fixed.key.length;
      const first = tokens.findIndex((t) => t.word_position - 1 === at);
      const last = tokens.findIndex((t) => t.word_position - 1 + t.surface_form.length === at + fixed.key.length);
      if (first < 0 || last < first) continue; // not on token boundaries
      if (first === last && tokens[first].fixed) continue; // a longer phrase already claimed it
      const merged = first !== last;
      tokens.splice(first, last - first + 1, {
        ...tokens[first],
        surface_form: fixed.key,
        basic_form: fixed.lemma ?? (merged || fixed.gloss ? fixed.key : tokens[first].basic_form),
        reading: fixed.reading,
        pos: merged ? "名詞" : tokens[first].pos,
        word_position: at + 1,
        fixed: fixed.gloss ? { r: fixed.reading, ...fixed.gloss } : true,
      });
    }
  }
  // 何 is なに on its own but なん before です/だ/の/と — kuromoji always says なに.
  tokens.forEach((t, i) => {
    if (t.surface_form === "何" && /^[でだのと]/.test(tokens[i + 1]?.surface_form ?? "")) t.reading = "ナン";
  });
  return tokens;
}

const tokenizer = await new Promise((resolve, reject) => {
  kuromoji
    .builder({ dicPath: new URL("../node_modules/kuromoji/dict/", import.meta.url).pathname })
    .build((err, t) => (err ? reject(err) : resolve(t)));
});

/**
 * Tokenizes a sentence into [{s, f?, g?, h?}]: surface, furigana parts,
 * glossary key, and whether it's part of `highlight` (the word a card is
 * teaching — matched by dictionary form, then by exact text, then by stem).
 */
function tokenize(text, highlight) {
  const tokens = applyFixedReadings(tokenizer.tokenize(text), text);
  let range = null;
  if (highlight) {
    const byLemma = tokens.findIndex((t) => t.basic_form === highlight);
    if (byLemma >= 0) {
      const start = tokens[byLemma].word_position - 1;
      range = [start, start + tokens[byLemma].surface_form.length];
    } else {
      const candidates = [highlight, highlight.slice(0, -1)].filter((c) => c.length > 0);
      for (const c of candidates) {
        const at = text.indexOf(c);
        if (at >= 0) {
          range = [at, at + c.length];
          break;
        }
      }
    }
    if (!range) console.warn(`  ! "${highlight}" not found in its example: ${text}`);
  }

  return tokens.map((t) => {
    const out = { s: t.surface_form };
    const f = furigana(t.surface_form, t.reading);
    if (f) out.f = f;
    const g = glossFor(t);
    if (g) out.g = g;
    if (range) {
      const start = t.word_position - 1;
      const end = start + t.surface_form.length;
      if (start < range[1] && end > range[0]) out.h = 1;
    }
    return out;
  });
}

/** A fill-in-the-blank line, tokenized on each side of the ＿＿. */
function tokenizeCloze(text) {
  const [before, after] = text.split("＿＿");
  return { before: before ? tokenize(before) : [], after: after ? tokenize(after) : [] };
}

const out = {
  words: words.map((w) => ({
    key: w.key,
    reading: w.reading,
    meaning: w.meaning,
    pos: w.pos,
    level: w.level,
    example: { tokens: tokenize(w.example.jp, w.key), en: w.example.en },
  })),
  grammar: grammar.map((g) => ({
    ...g,
    examples: g.examples.map((e) => ({ tokens: tokenize(e.jp), en: e.en })),
    quiz: { ...g.quiz, jp: undefined, ...tokenizeCloze(g.quiz.jp) },
  })),
  facts: facts.map((f) => ({
    ...f,
    example: f.example ? { tokens: tokenize(f.example.jp), en: f.example.en } : undefined,
  })),
  stories: stories.map((s) => ({
    ...s,
    sentences: s.sentences.map((line) => ({ tokens: tokenize(line.jp), en: line.en })),
  })),
  glossary,
};

mkdirSync(new URL("../public/feed", import.meta.url), { recursive: true });
const outPath = new URL("../public/feed/content.json", import.meta.url);
const json = JSON.stringify(out);
writeFileSync(outPath, json);
console.log(
  `Wrote public/feed/content.json — ${out.words.length} words, ${out.grammar.length} grammar points, ` +
    `${out.facts.length} facts, ${out.stories.length} stories, ${Object.keys(glossary).length} glosses ` +
    `(${Math.round(json.length / 1024)} KB)`,
);
