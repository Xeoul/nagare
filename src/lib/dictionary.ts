import sampleDictionary from "@/data/sample-dictionary.json";

export type DictionaryEntry = {
  surface: string[];
  reading: string;
  pos: string;
  /** Only the tiny hand-curated sample set carries this; JMdict entries don't yet. */
  level?: string;
  meanings: string[];
};

type JmdictEntry = { reading: string; pos: string; meanings: string[] };
export type JmdictLookup = Record<string, JmdictEntry>;

const sampleBySurface = new Map<string, DictionaryEntry>();
for (const entry of sampleDictionary as DictionaryEntry[]) {
  for (const form of entry.surface) {
    sampleBySurface.set(form, entry);
  }
}

let jmdictPromise: Promise<JmdictLookup | null> | null = null;

/**
 * Lazily fetches the bundled JMdict-derived "common words" lookup (see
 * scripts/build-dictionary.mjs and NOTICE.md for how it's built and
 * licensed) — ~22k entries, cached in memory after the first load, same
 * pattern as the tokenizer's dictionary. Resolves to null on failure so a
 * flaky network doesn't break reading, just word lookups.
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

/**
 * Looks up a token. The tiny curated sample set takes priority since it
 * carries JLPT level tags the bulk JMdict extract doesn't have yet; every
 * other word falls through to JMdict.
 */
export function lookupDictionary(
  basicForm: string,
  surfaceForm: string,
  jmdict: JmdictLookup | null,
): DictionaryEntry | null {
  const sample = sampleBySurface.get(basicForm) ?? sampleBySurface.get(surfaceForm);
  if (sample) return sample;

  const hit = jmdict?.[basicForm] ?? jmdict?.[surfaceForm];
  if (!hit) return null;
  return { surface: [basicForm], reading: hit.reading, pos: hit.pos, meanings: hit.meanings };
}
