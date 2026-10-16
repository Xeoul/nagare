import { del, get, set, update } from "idb-keyval";

export type LibraryItem = {
  id: string;
  title: string;
  text: string;
  kind: "txt" | "epub" | "pdf" | "sample" | "classic" | "starter" | "reader";
  createdAt: number;
  /** Fraction of the document read, 0–1. Phase 0's resume-position stand-in. */
  progress: number;
  /** Set whenever the reader is opened; drives "Continue reading". */
  lastOpenedAt?: number;
};

/** Everything about an item except its text — what lists and shelves need. */
export type LibraryMeta = Omit<LibraryItem, "text">;

// Each item's text lives under its own key; the small, changing fields
// (progress, last opened) live together in one metadata list. Listing the
// library then reads that one list instead of every book's full text —
// a novel is several hundred KB — and progress updates go through a single
// IndexedDB transaction, so two quick writes can't overwrite each other.
const META_KEY = "nagare:library:meta";
/** The older format: just an ordered list of ids. Read once to migrate. */
const LEGACY_INDEX_KEY = "nagare:library:index";
const itemKey = (id: string) => `nagare:item:${id}`;

function toMeta(item: LibraryItem): LibraryMeta {
  const meta: Partial<LibraryItem> = { ...item };
  delete meta.text;
  return meta as LibraryMeta;
}

/** Set once the metadata list is known to exist, so writes can skip the check. */
let migrated = false;

async function getMetas(): Promise<LibraryMeta[]> {
  const metas = await get<LibraryMeta[]>(META_KEY);
  if (metas) {
    migrated = true;
    return metas;
  }
  const ids = (await get<string[]>(LEGACY_INDEX_KEY)) ?? [];
  const items = await Promise.all(ids.map((id) => get<LibraryItem>(itemKey(id))));
  const migratedMetas = items
    .filter((item): item is LibraryItem => Boolean(item))
    .map(toMeta);
  // Only fills the list in if nothing beat us to it, so two migrations
  // racing (or an add right after one) can't overwrite each other.
  let result = migratedMetas;
  await update<LibraryMeta[]>(META_KEY, (existing) => (result = existing ?? migratedMetas));
  migrated = true;
  return result;
}

// Every write migrates first: an update landing on a not-yet-migrated
// library would otherwise save an empty list over it. Once that's known to
// be done, the write starts straight away — which matters when the reader
// saves its last position as the page is closing.
async function updateMeta(id: string, change: (meta: LibraryMeta) => LibraryMeta): Promise<void> {
  if (!migrated) await getMetas();
  await update<LibraryMeta[]>(META_KEY, (metas = []) =>
    metas.map((meta) => (meta.id === id ? change(meta) : meta)),
  );
}

/** Every item's metadata (no text), newest first. */
export async function listItems(): Promise<LibraryMeta[]> {
  return [...(await getMetas())].sort((a, b) => b.createdAt - a.createdAt);
}

export async function getItem(id: string): Promise<LibraryItem | undefined> {
  const [stored, metas] = await Promise.all([get<LibraryItem>(itemKey(id)), getMetas()]);
  if (!stored) return undefined;
  const meta = metas.find((m) => m.id === id);
  return meta ? { ...stored, ...meta } : stored;
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
  await getMetas();
  await set(itemKey(item.id), item);
  await update<LibraryMeta[]>(META_KEY, (metas = []) => [toMeta(item), ...metas]);
  return item;
}

export function updateProgress(id: string, progress: number): Promise<void> {
  return updateMeta(id, (meta) => ({ ...meta, progress }));
}

export function markOpened(id: string): Promise<void> {
  return updateMeta(id, (meta) => ({ ...meta, lastOpenedAt: Date.now() }));
}

export async function removeItem(id: string): Promise<void> {
  await getMetas();
  await del(itemKey(id));
  await update<LibraryMeta[]>(META_KEY, (metas = []) => metas.filter((meta) => meta.id !== id));
}
