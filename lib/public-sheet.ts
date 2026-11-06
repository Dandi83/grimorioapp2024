import type { Monster } from "./monsters-types";

/** The sections the administrator can hide on a creature «Dalla redazione» (lib/editorial-draft.ts HIDEABLE_SECTIONS). */
const HIDEABLE = ["descrizione", "tratti", "azioni", "azioni_bonus", "reazioni", "azioni_leggendarie", "storia", "tattiche", "tana", "agganci", "varianti"] as const;

/**
 * What the public may see of a sheet (PROMPT 44): the sections hidden by the administrator taken away, so they exist
 * neither in the page nor in its metadata. The sheets without hidden sections are returned as they are.
 */
// PROMPT 66: also the stored draft (HomebrewDraft), for /api/tpk/creature-originali: the same sections go away.
export function publicSheet<T extends Partial<Monster> | { sezioni_nascoste?: readonly string[] }>(monster: T): T {
  if (!monster.sezioni_nascoste?.length) return monster;
  const copy: Record<string, unknown> = { ...monster };
  for (const key of monster.sezioni_nascoste) if ((HIDEABLE as readonly string[]).includes(key)) delete copy[key];
  delete copy.sezioni_nascoste;
  return copy as T;
}
