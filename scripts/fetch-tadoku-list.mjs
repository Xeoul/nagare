// One-time data-prep script: lists the free graded readers on
// https://tadoku.org/japanese/free-books/ (NPO 多言語多読) — title, Tadoku
// level and book page — and writes src/data/tadoku-books.json.
//
// Only this list is bundled, never the books: they're CC BY-NC-ND 4.0, and
// NPO 多言語多読's FAQ (https://tadoku.org/japanese/free-books/note/) rules
// out redistributing them with anything added. The app links to each book's
// page, with credit; a learner can download the PDF there and import it for
// their own reading (see src/lib/importFile.ts).
//
// Usage: node scripts/fetch-tadoku-list.mjs

import { writeFileSync } from "node:fs";

const PAGE = "https://tadoku.org/japanese/free-books/";
const LEVEL_ORDER = ["l-start", "l0", "l1", "l2", "l3", "l4", "l5"];

const decode = (s) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&#8217;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();

const html = await (await fetch(PAGE)).text();
const books = [];
const seen = new Set();
for (const block of html.split(/<div class="col-6 col-sm-4[^"]*freebooks-book-item"/).slice(1)) {
  const level = block.match(/data-level="([^"]+)"/)?.[1];
  const link = block.match(/<div class="bl-title">\s*<a href="(https:\/\/tadoku\.org\/japanese\/book\/\d+\/)">\s*([\s\S]*?)\s*<\/a>/);
  if (!level || !link || seen.has(link[1])) continue;
  seen.add(link[1]);
  books.push({ title: decode(link[2]), level: level.replace(/^l-?/, ""), url: link[1] });
}
books.sort((a, b) => LEVEL_ORDER.indexOf(`l${a.level === "start" ? "-start" : a.level}`) - LEVEL_ORDER.indexOf(`l${b.level === "start" ? "-start" : b.level}`));

writeFileSync(
  new URL("../src/data/tadoku-books.json", import.meta.url),
  JSON.stringify(books, null, 1) + "\n",
);
console.log(`Wrote ${books.length} books`);
