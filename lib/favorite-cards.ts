import type { MonsterListItem } from "./monsters-types";
import type { SpellListItem } from "./spells-types";

/**
 * The rows of Preferiti (PROMPT 43): only the cards saved on this device, from /preferiti/schede (app/preferiti/schede),
 * never the whole catalog. The last rows received stay on the device too (SNAPSHOT_KEY): Preferiti opens with them at
 * once and shows them offline. The list of favorites itself (grimorio.favorites.v1) is never changed here.
 */
export interface FavoriteCards {
  spells: SpellListItem[];
  monsters: (MonsterListItem & { autore?: string | null })[];
  /** The favorites asked for this copy: one without a row (a hidden section, a card removed) is known, not missing. */
  asked?: string[];
}

const SNAPSHOT_KEY = "grimorio.favorites.cards.v1";
const EMPTY: FavoriteCards = { spells: [], monsters: [] };

/** The ids of the spells and of the creatures («mostro:<id>») among the favorites, sorted (one address per set). */
export function favoriteIds(favorites: readonly string[]): { s: string[]; m: string[] } {
  const s: string[] = [], m: string[] = [];
  for (const id of favorites) (id.startsWith("mostro:") ? m : s).push(id.startsWith("mostro:") ? id.slice(7) : id);
  return { s: s.sort(), m: m.sort() };
}

export function favoriteCardsUrl(favorites: readonly string[]): string | null {
  const { s, m } = favoriteIds(favorites);
  if (!s.length && !m.length) return null;
  const params = new URLSearchParams();
  if (s.length) params.set("s", s.join(","));
  if (m.length) params.set("m", m.join(","));
  return `/preferiti/schede?${params}`;
}

/** The rows kept on the device (none when never received, or storage unavailable). */
export function readFavoriteCards(): FavoriteCards {
  try {
    const value = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "null") as FavoriteCards | null;
    return value && Array.isArray(value.spells) && Array.isArray(value.monsters) ? value : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** True when the device already keeps a row for every favorite. */
export function favoriteCardsKept(favorites: readonly string[], kept = readFavoriteCards()): boolean {
  const ids = new Set([...kept.asked ?? [], ...kept.spells.map(spell => spell.id), ...kept.monsters.map(monster => `mostro:${monster.id}`)]);
  return favorites.every(id => ids.has(id));
}

/** Asks the rows of the favorites and keeps them on the device; null when the network does not answer. */
export async function fetchFavoriteCards(favorites: readonly string[]): Promise<FavoriteCards | null> {
  const url = favoriteCardsUrl(favorites);
  if (!url) return EMPTY;
  try {
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) return null;
    const cards = { ...await response.json() as FavoriteCards, asked: [...favorites] };
    try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(cards)); } catch { /* storage full or off: online only */ }
    return cards;
  } catch {
    return null;
  }
}

/** When the browser has nothing else to do (requestIdleCallback, else a pause, for Safari). */
export function whenIdle(task: () => void, timeout = 4000): () => void {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(task, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(task, 2000);
  return () => window.clearTimeout(id);
}
