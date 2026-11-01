import type { Monster } from "./monsters-types";

/** The sections the administrator can hide on a creature «Dalla redazione» (lib/editorial-draft.ts HIDEABLE_SECTIONS). */
const HIDEABLE = ["descrizione", "tratti", "azioni", "azioni_bonus", "reazioni", "azioni_leggendarie", "storia", "tattiche", "tana", "agganci", "varianti"] as const;

/**
 * What the public may see of a sheet (PROMPT 44): the sections hidden by the administrator taken away, so they exist
 * neither in the page nor in its metadata. The sheets without hidden sections are returned as they are.
 */
export function publicSheet<T extends Partial<Monster>>(monster: T): T {
  if (!monster.sezioni_nascoste?.length) return monster;
  const copy: Partial<Monster> = { ...monster };
  for (const key of monster.sezioni_nascoste) if ((HIDEABLE as readonly string[]).includes(key)) delete copy[key as (typeof HIDEABLE)[number]];
  delete copy.sezioni_nascoste;
  return copy as T;
}
