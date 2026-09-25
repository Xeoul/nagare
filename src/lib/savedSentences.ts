import { get, set } from "idb-keyval";

const KEY = "nagare:saved-sentences";

export type SavedSentence = {
  text: string;
  sourceTitle: string;
  level: string;
  savedAt: number;
};

export async function getSavedSentences(): Promise<SavedSentence[]> {
  return (await get<SavedSentence[]>(KEY)) ?? [];
}

export async function isSentenceSaved(text: string): Promise<boolean> {
  return (await getSavedSentences()).some((s) => s.text === text);
}

/** Adds the sentence, or removes it if already saved. Returns whether it's saved afterward. */
export async function toggleSavedSentence(
  sentence: Omit<SavedSentence, "savedAt">,
  forceSave = false,
): Promise<boolean> {
  const current = await getSavedSentences();
  const exists = current.some((s) => s.text === sentence.text);
  if (exists && forceSave) return true;
  const next = exists
    ? current.filter((s) => s.text !== sentence.text)
    : [{ ...sentence, savedAt: Date.now() }, ...current];
  await set(KEY, next);
  return !exists;
}
