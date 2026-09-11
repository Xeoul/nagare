// One-time data-prep script: turns elzup/jlpt-word-list's per-level CSVs
// into a single word -> level lookup, committed as
// public/dictionary/jlpt-levels.json. Not run at app build/runtime.
//
// Usage: node scripts/build-jlpt-levels.mjs /path/to/jlpt-word-list/src
//
// Source: https://github.com/elzup/jlpt-word-list (MIT licence).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const srcDir = process.argv[2];
if (!srcDir) {
  console.error("Usage: node scripts/build-jlpt-levels.mjs /path/to/jlpt-word-list/src");
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Levels ordered easiest-first so a word appearing on multiple lists (the
// source data isn't perfectly disjoint) keeps its easiest classification.
const LEVELS = ["n5", "n4", "n3", "n2", "n1"];
const levelToTag = { n5: "N5", n4: "N4", n3: "N3", n2: "N2", n1: "N1" };

const byWord = {};
for (const level of LEVELS) {
  const rows = parseCsv(readFileSync(path.join(srcDir, `${level}.csv`), "utf-8"));
  const [header, ...body] = rows;
  const expressionIdx = header.indexOf("expression");
  for (const row of body) {
    const expression = row[expressionIdx]?.trim();
    if (!expression || byWord[expression]) continue;
    byWord[expression] = levelToTag[level];
  }
}

mkdirSync(new URL("../public/dictionary", import.meta.url), { recursive: true });
const outPath = new URL("../public/dictionary/jlpt-levels.json", import.meta.url);
writeFileSync(outPath, JSON.stringify(byWord));
console.error(`Wrote ${Object.keys(byWord).length} word -> level entries to ${outPath.pathname}`);
