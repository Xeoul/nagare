// One-time data-prep script: builds public/aozora/catalog.json, the index
// behind the library's "Search Aozora Bunko" box — every public-domain work
// in modern spelling (新字新仮名) from Aozora Bunko's official catalog CSV.
// The texts themselves aren't bundled; the app fetches a work from the
// aozorahack mirror when you import it (see src/lib/aozora.ts).
//
// Usage: node scripts/build-aozora-catalog.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import JSZip from "jszip";

const CATALOG_ZIP = "https://www.aozora.gr.jp/index_pages/list_person_all_extended_utf8.zip";

/** Minimal RFC 4180 CSV parser (quoted fields, doubled quotes, embedded newlines). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

const zip = await JSZip.loadAsync(await (await fetch(CATALOG_ZIP)).arrayBuffer());
const csvName = Object.keys(zip.files).find((name) => name.endsWith(".csv"));
const [header, ...rows] = parseCsv((await zip.file(csvName).async("text")).replace(/^﻿/, ""));
const col = (name) => header.indexOf(name);
const C = {
  id: col("作品ID"),
  title: col("作品名"),
  titleKana: col("作品名読み"),
  spelling: col("文字遣い種別"),
  workCopyright: col("作品著作権フラグ"),
  last: col("姓"),
  first: col("名"),
  lastKana: col("姓読み"),
  firstKana: col("名読み"),
  role: col("役割フラグ"),
  personCopyright: col("人物著作権フラグ"),
  url: col("テキストファイルURL"),
};

const authors = [];
const authorIndex = new Map();
const works = [];
const seen = new Set();
for (const r of rows) {
  if (r.length < header.length) continue;
  if (r[C.spelling] !== "新字新仮名" || r[C.role] !== "著者") continue;
  if (r[C.workCopyright] !== "なし" || r[C.personCopyright] !== "なし") continue;
  const match = r[C.url].match(/\/cards\/(\d+\/files\/[^/]+)\.zip$/);
  if (!match || seen.has(r[C.id])) continue;
  seen.add(r[C.id]);
  const author = `${r[C.last]}${r[C.first]}`;
  if (!authorIndex.has(author)) {
    authorIndex.set(author, authors.length);
    authors.push([author, `${r[C.lastKana]}${r[C.firstKana]}`]);
  }
  // [title, title reading, author index, "<person>/files/<name>", work id]
  works.push([r[C.title], r[C.titleKana], authorIndex.get(author), match[1], Number(r[C.id])]);
}

mkdirSync(new URL("../public/aozora/", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../public/aozora/catalog.json", import.meta.url),
  JSON.stringify({ authors, works }),
);
console.log(`Wrote ${works.length} works by ${authors.length} authors`);
