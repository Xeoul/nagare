// Kuromoji's tokenizer dictionary is loaded by the browser at runtime from a
// static path, so it has to live under public/. It's copied from
// node_modules here (postinstall) rather than committed, since it's ~18MB of
// generated data that node_modules already provides.
import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, "..", "node_modules", "kuromoji", "dict");
const dest = path.join(root, "..", "public", "dict");

await mkdir(dest, { recursive: true });
await cp(src, dest, { recursive: true });
console.log(`Copied kuromoji dictionary to ${path.relative(process.cwd(), dest)}`);
