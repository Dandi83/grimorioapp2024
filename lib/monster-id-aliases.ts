import renamed from "./data/renamed-monster-ids.json";

/**
 * Addresses used by the 2014 sheets before the "-2014" suffix. Shared links are
 * redirected in next.config.mjs (same list); saved favorites are renamed here.
 */
export const RENAMED_MONSTER_IDS: Readonly<Record<string, string>> = Object.fromEntries(renamed.map(id => [id, `${id}-2014`]));

/** Favorites are stored as "mostro:<id>". */
export function renameFavoriteId(favorite: string): string {
  const id = favorite.startsWith("mostro:") ? RENAMED_MONSTER_IDS[favorite.slice(7)] : undefined;
  return id ? `mostro:${id}` : favorite;
}
