import renamed from "./data/renamed-monster-ids.json";
import mergedSpells from "./data/merged-spell-ids.json";

/**
 * Addresses used by the 2014 sheets before the "-2014" suffix. Shared links are
 * redirected in next.config.mjs (same list); saved favorites are renamed here.
 */
export const RENAMED_MONSTER_IDS: Readonly<Record<string, string>> = Object.fromEntries(renamed.map(id => [id, `${id}-2014`]));

/**
 * Duplicate spell rows shown as one card (approved 20/10/2026): the hidden address opens the kept one.
 * Shared links are redirected in next.config.mjs (same list); the database rows stay untouched.
 */
export const MERGED_SPELL_IDS: Readonly<Record<string, string>> = mergedSpells;

/** Favorites are stored as "mostro:<id>" for creatures and as the bare id for spells. */
export function renameFavoriteId(favorite: string): string {
  if (!favorite.startsWith("mostro:")) return MERGED_SPELL_IDS[favorite] ?? favorite;
  const id = RENAMED_MONSTER_IDS[favorite.slice(7)];
  return id ? `mostro:${id}` : favorite;
}
