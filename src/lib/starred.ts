import { get, set } from "idb-keyval";

const KEY = "nagare:starred";

export type StarredWord = {
  key: string;
  reading: string;
  meanings: string[];
  addedAt: number;
};

/**
 * A flat "add to study deck" list — the data seam Phase 1's vocab SRS deck
 * (docs/PLAN.md §3.3) will read from. No scheduling or review logic lives
 * here yet; Phase 0 only needs to remember what was tapped.
 */
export async function getStarred(): Promise<StarredWord[]> {
  return (await get<StarredWord[]>(KEY)) ?? [];
}

export async function isStarred(key: string): Promise<boolean> {
  return (await getStarred()).some((word) => word.key === key);
}

export async function toggleStarred(
  word: Omit<StarredWord, "addedAt">,
): Promise<StarredWord[]> {
  const current = await getStarred();
  const exists = current.some((entry) => entry.key === word.key);
  const next = exists
    ? current.filter((entry) => entry.key !== word.key)
    : [{ ...word, addedAt: Date.now() }, ...current];
  await set(KEY, next);
  return next;
}
