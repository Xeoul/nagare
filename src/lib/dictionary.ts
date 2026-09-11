export type JmdictEntry = {
  reading: string;
  pos: string;
  meanings: string[];
  level?: string;
};
export type JmdictLookup = Record<string, JmdictEntry>;

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

export function lookupDictionary(
  basicForm: string,
  surfaceForm: string,
  jmdict: JmdictLookup | null,
): JmdictEntry | null {
  return jmdict?.[basicForm] ?? jmdict?.[surfaceForm] ?? null;
}
