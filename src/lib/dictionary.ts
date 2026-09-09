import sampleDictionary from "@/data/sample-dictionary.json";

export type DictionaryEntry = {
  surface: string[];
  reading: string;
  pos: string;
  level: string;
  meanings: string[];
};

const bySurface = new Map<string, DictionaryEntry>();
for (const entry of sampleDictionary as DictionaryEntry[]) {
  for (const form of entry.surface) {
    bySurface.set(form, entry);
  }
}

/**
 * Looks up a token against the bundled sample dictionary. This is a curated
 * subset standing in for the real JMdict/KANJIDIC2 store described in
 * docs/PLAN.md — swap this module out once that data pipeline exists.
 */
export function lookupDictionary(
  basicForm: string,
  surfaceForm: string,
): DictionaryEntry | null {
  return bySurface.get(basicForm) ?? bySurface.get(surfaceForm) ?? null;
}
