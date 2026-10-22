import "server-only";
import { activeOverrideMap, applyOverrides, type ContentOverride } from "./content-overrides-apply";
import { activeOverrides } from "./content-overrides";
import { WEAPON_EDITABLE_FIELDS, buildWeapons, weapons, type Weapon } from "./equipment";
import type { EquipmentEdition } from "./equipment-types";

/**
 * The ONE place where manual corrections reach the public pages: each section reads its
 * data through here (lib/content-sections.ts lists the sections). Server only, so the full
 * texts never go to the browser; the original files stay untouched.
 */

/** Corrections applied to a card, by edition: shown at the bottom of the card. */
export type CardCorrections = Partial<Record<EquipmentEdition, ContentOverride[]>>;

export interface CorrectedWeapons {
  weapons: Weapon[];
  corrections: Map<string, CardCorrections>;
}

export async function getCorrectedWeapons(): Promise<CorrectedWeapons> {
  const rows = await activeOverrides("armi");
  const corrections = new Map<string, CardCorrections>();
  if (!rows.length) return { weapons, corrections };
  const active = activeOverrideMap(rows);
  const list = buildWeapons((id, edition, raw) => {
    const { record, applied } = applyOverrides(raw, "armi", id, edition, active, WEAPON_EDITABLE_FIELDS);
    if (applied.length) corrections.set(id, { ...corrections.get(id), [edition]: applied });
    return record;
  });
  return { weapons: list, corrections };
}
