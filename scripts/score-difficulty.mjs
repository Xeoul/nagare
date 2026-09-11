// Estimates a JLPT reading-difficulty level for a text by tokenizing it and
// checking how much of its *content* vocabulary (nouns/verbs/adjectives/
// adverbs — not particles, which are already universal) falls into each
// JLPT tier of public/dictionary/jlpt-levels.json.
//
// Aozora Bunko carries no JLPT tagging of its own (it isn't learner
// material), so this is a computed estimate, not an official grading —
// and native literature reliably has a large share of vocabulary (proper
// nouns, archaic forms, rare compounds) outside any JLPT list at all,
// which by itself is a real difficulty signal graded readers don't have to
// contend with. That share is reported alongside the estimate rather than
// hidden by it.
//
// Usage: node scripts/score-difficulty.mjs <file1.txt> [file2.txt ...]
// (files should already be markup-stripped plain text)

import { readFileSync } from "node:fs";
import kuromoji from "kuromoji";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/score-difficulty.mjs <file1.txt> [file2.txt ...]");
  process.exit(1);
}

const jlptLevels = JSON.parse(
  readFileSync(new URL("../public/dictionary/jlpt-levels.json", import.meta.url), "utf-8"),
);

const LEVELS = ["N5", "N4", "N3", "N2", "N1"];
const CONTENT_POS = new Set(["名詞", "動詞", "形容詞", "副詞", "連体詞", "感動詞"]);

function buildTokenizer() {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: "public/dict/" }).build((err, tokenizer) => {
      if (err) reject(err);
      else resolve(tokenizer);
    });
  });
}

function scoreText(text, tokenizer) {
  const tokens = tokenizer.tokenize(text);
  const seen = new Set();
  const counts = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
  let unclassified = 0;
  let contentTypeCount = 0;

  for (const t of tokens) {
    if (!CONTENT_POS.has(t.pos)) continue;
    const key = t.basic_form && t.basic_form !== "*" ? t.basic_form : t.surface_form;
    if (seen.has(key)) continue; // count vocabulary types, not raw frequency
    seen.add(key);
    contentTypeCount++;
    const level = jlptLevels[key] ?? jlptLevels[t.surface_form];
    if (level) counts[level]++;
    else unclassified++;
  }

  const classifiedTotal = LEVELS.reduce((sum, l) => sum + counts[l], 0);
  let cumulative = 0;
  let estimated = "N1";
  for (const level of LEVELS) {
    cumulative += counts[level];
    if (classifiedTotal > 0 && cumulative / classifiedTotal >= 0.8) {
      estimated = level;
      break;
    }
  }

  return {
    estimated,
    unclassifiedShare: contentTypeCount > 0 ? unclassified / contentTypeCount : 0,
    contentTypeCount,
    counts,
  };
}

const tokenizer = await buildTokenizer();
for (const file of files) {
  const text = readFileSync(file, "utf-8");
  const result = scoreText(text, tokenizer);
  console.log(
    `${file}\n  estimated: ${result.estimated}  (${result.contentTypeCount} unique content words, ` +
      `${(result.unclassifiedShare * 100).toFixed(0)}% outside any JLPT list)\n` +
      `  distribution: ${LEVELS.map((l) => `${l}=${result.counts[l]}`).join(" ")}`,
  );
}
