import { get, set, del } from "idb-keyval";

export type LibraryItem = {
  id: string;
  title: string;
  text: string;
  kind: "txt" | "epub" | "sample" | "classic" | "starter";
  createdAt: number;
  /** Fraction of the document read, 0–1. Phase 0's resume-position stand-in. */
  progress: number;
};

const INDEX_KEY = "nagare:library:index";
const itemKey = (id: string) => `nagare:item:${id}`;

async function getIndex(): Promise<string[]> {
  return (await get<string[]>(INDEX_KEY)) ?? [];
}

export async function listItems(): Promise<LibraryItem[]> {
  const ids = await getIndex();
  const items = await Promise.all(ids.map((id) => get<LibraryItem>(itemKey(id))));
  return items
    .filter((item): item is LibraryItem => Boolean(item))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getItem(id: string): Promise<LibraryItem | undefined> {
  return get<LibraryItem>(itemKey(id));
}

export async function addItem(
  input: Omit<LibraryItem, "id" | "createdAt" | "progress">,
): Promise<LibraryItem> {
  const item: LibraryItem = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    progress: 0,
  };
  await set(itemKey(item.id), item);
  await set(INDEX_KEY, [item.id, ...(await getIndex())]);
  return item;
}

export async function updateProgress(id: string, progress: number): Promise<void> {
  const item = await getItem(id);
  if (!item) return;
  await set(itemKey(id), { ...item, progress });
}

export async function removeItem(id: string): Promise<void> {
  await del(itemKey(id));
  await set(INDEX_KEY, (await getIndex()).filter((existing) => existing !== id));
}
