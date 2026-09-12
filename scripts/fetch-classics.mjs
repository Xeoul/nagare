// One-time data-prep script: downloads each work listed in CLASSICS
// (src/lib/aozora.ts) from the Aozora Bunko mirror, strips its ruby/
// editorial markup, and writes plain text to public/classics/<slug>.txt —
// committed as a static asset so opening a classic in the app is instant,
// with no live fetch to an external site. Not run at app build/runtime;
// re-run by hand if CLASSICS changes.
//
// Usage: node scripts/fetch-classics.mjs

import { writeFileSync, mkdirSync } from "node:fs";

const AOZORA_BASE = "https://aozorahack.org/aozorabunko_text/";

const CLASSICS = [
  { path: "cards/000879/files/92_ruby_164/92_ruby_164.txt", slug: "kumo-no-ito" },
  { path: "cards/000879/files/127_ruby_150/127_ruby_150.txt", slug: "rashomon" },
  { path: "cards/000879/files/42_ruby_154/42_ruby_154.txt", slug: "hana" },
  { path: "cards/000879/files/43015_ruby_17393/43015_ruby_17393.txt", slug: "toshishun" },
  { path: "cards/000148/files/799_ruby_6024/799_ruby_6024.txt", slug: "yumejuya" },
  { path: "cards/000081/files/43754_ruby_17594/43754_ruby_17594.txt", slug: "chumon-no-oi-ryoriten" },
  { path: "cards/000081/files/46605_ruby_29758/46605_ruby_29758.txt", slug: "yamanashi" },
  { path: "cards/000081/files/456_ruby_145/456_ruby_145.txt", slug: "ginga-tetsudo-no-yoru" },
  { path: "cards/000035/files/1567_ruby_4948/1567_ruby_4948.txt", slug: "hashire-merosu" },
  { path: "cards/000121/files/628_ruby_649/628_ruby_649.txt", slug: "gongitsune" },
  { path: "cards/000119/files/624_ruby_5668/624_ruby_5668.txt", slug: "sangetsuki" },
  { path: "cards/000129/files/45245_ruby_21882/45245_ruby_21882.txt", slug: "takasebune" },
];

/** Mirrors stripAozoraMarkup in src/lib/aozora.ts (kept standalone here). */
function stripAozoraMarkup(raw) {
  const lines = raw.split(/\r\n|\r|\n/);

  const dashLineIndices = [];
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

mkdirSync(new URL("../public/classics/", import.meta.url), { recursive: true });

for (const { path, slug } of CLASSICS) {
  const url = AOZORA_BASE + path;
  process.stdout.write(`Fetching ${slug}... `);
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`FAILED (${res.status})`);
    continue;
  }
  const buffer = await res.arrayBuffer();
  const raw = new TextDecoder("shift_jis").decode(buffer);
  const text = stripAozoraMarkup(raw);
  writeFileSync(new URL(`../public/classics/${slug}.txt`, import.meta.url), text, "utf-8");
  console.log(`OK (${text.length} chars)`);
}
