import data from "./data/public-spell-ids.json";

/**
 * The addresses of the spells without proper names (PROMPT 8): «/spell/sfera-elastica» for the row stored as
 * «sfera-elastica-di-0tiluke». Only the address changes: the database rows, the favorites, the statistics and
 * the reserved area keep the stored id; the old addresses answer 308 (next.config.mjs, same list).
 */
export const PUBLIC_SPELL_IDS: Readonly<Record<string, string>> = data.ids;

const STORED_SPELL_IDS: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(PUBLIC_SPELL_IDS).map(([stored, open]) => [open, stored]));

/** The address id of a stored spell id (itself when it has no proper name). */
export function publicSpellId(id: string): string {
  return PUBLIC_SPELL_IDS[id] ?? id;
}

/** The stored id of an address id: the inverse of publicSpellId (any other id unchanged). */
export function storedSpellId(id: string): string {
  return STORED_SPELL_IDS[id] ?? id;
}

/** The public page of a spell, from its stored id. */
export function spellHref(id: string): string {
  return `/spell/${encodeURIComponent(publicSpellId(id))}`;
}

/** The stored spell id of a page address («/spell/<id>»), or undefined for any other page. */
export function spellIdOfPath(path: string): string | undefined {
  const match = /^\/spell\/([^/?#]+)$/.exec(path);
  if (!match) return undefined;
  try {
    return storedSpellId(decodeURIComponent(match[1]));
  } catch {
    return undefined;
  }
}

