import "server-only";
import { activeOverrideMap, applyOverrides, type ContentOverride } from "./content-overrides-apply";
import { activeOverrides } from "./content-overrides";
import { armors } from "./armor";
import { gearEntries } from "./adventuring-gear-editions";
import { conditions, legacyConditions } from "./conditions";
import {
  armorAdapter, gear2014Adapter, gear2024Adapter, magicItemAdapter, manualAdapter, tool2014Adapter, tool2024Adapter, type CardAdapter,
} from "./content-adapters";
import { WEAPON_EDITABLE_FIELDS, buildWeapons, weapons, type Weapon } from "./equipment";
import { magicItemEntries } from "./magic-items-editions";
import { getManualEntry, manualEntries } from "./manual";
import type { ManualEntry } from "./manual-types";
import { toolEntries } from "./tools-editions";
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

// ——— Every other section: the same overlay on the cards built from the project files. ———

function overlay<T>(card: T, adapter: CardAdapter<T>, sezione: string, id: string, edizione: string, active: Map<string, ContentOverride>) {
  const values = adapter.read(card);
  const { record, applied } = applyOverrides(values, sezione, id, edizione, active, Object.keys(values));
  return { card: applied.length ? adapter.write(card, record) : card, applied };
}

export interface Corrected<T> { list: T; corrections: Map<string, CardCorrections> }

async function correctEntries<E extends { id: string; editions: Partial<Record<EquipmentEdition, unknown>> }>(
  sezione: string, entries: E[], adapterOf: (edition: EquipmentEdition) => CardAdapter<never>,
): Promise<Corrected<E[]>> {
  const rows = await activeOverrides(sezione);
  const corrections = new Map<string, CardCorrections>();
  if (!rows.length) return { list: entries, corrections };
  const active = activeOverrideMap(rows);
  const list = entries.map(entry => {
    let editions = entry.editions;
    for (const edition of ["2024", "2014"] as const) {
      const card = entry.editions[edition];
      if (!card) continue;
      const result = overlay(card as never, adapterOf(edition), sezione, entry.id, edition, active);
      if (!result.applied.length) continue;
      editions = { ...editions, [edition]: result.card };
      corrections.set(entry.id, { ...corrections.get(entry.id), [edition]: result.applied });
    }
    return editions === entry.editions ? entry : { ...entry, editions };
  });
  return { list, corrections };
}

export const getCorrectedArmors = () => correctEntries("armature", armors, () => armorAdapter as CardAdapter<never>);
export const getCorrectedGear = () => correctEntries("avventura", gearEntries, edition => (edition === "2024" ? gear2024Adapter : gear2014Adapter) as CardAdapter<never>);
export const getCorrectedTools = () => correctEntries("strumenti", toolEntries, edition => (edition === "2024" ? tool2024Adapter : tool2014Adapter) as CardAdapter<never>);
export const getCorrectedMagicItems = () => correctEntries("oggetti-magici", magicItemEntries, () => magicItemAdapter as CardAdapter<never>);

/** Conditions of both editions, as the Compendio list and the condition pages show them. */
export async function getCorrectedConditions(): Promise<Corrected<Record<EquipmentEdition, ManualEntry[]>>> {
  const rows = await activeOverrides("condizioni");
  const corrections = new Map<string, CardCorrections>();
  const lists = { "2024": conditions, "2014": legacyConditions };
  if (!rows.length) return { list: lists, corrections };
  const active = activeOverrideMap(rows);
  const correct = (edition: EquipmentEdition) => lists[edition].map(entry => {
    const result = overlay(entry, manualAdapter, "condizioni", entry.id, edition, active);
    if (result.applied.length) corrections.set(entry.id, { [edition]: result.applied });
    return result.card;
  });
  return { list: { "2024": correct("2024"), "2014": correct("2014") }, corrections };
}

/** A page of /manuale (a Manual entry or a condition), with its corrections. */
export async function getCorrectedManualEntry(id: string): Promise<{ entry: ManualEntry; corrections?: ContentOverride[]; section: string; edition: EquipmentEdition } | undefined> {
  const entry = getManualEntry(id);
  if (!entry) return undefined;
  const condition = entry.category === "condizioni";
  const section = condition ? "condizioni" : "manuale";
  const edition: EquipmentEdition = entry.edizione === "2014" ? "2014" : "2024";
  const rows = await activeOverrides(section);
  if (!rows.length) return { entry, section, edition };
  const result = overlay(entry, manualAdapter, section, id, edition, activeOverrideMap(rows));
  return { entry: result.card, section, edition, ...(result.applied.length ? { corrections: result.applied } : {}) };
}

/** Manual entries (not conditions) with corrected titles and texts: for the search index. */
export async function getCorrectedManualEntries(): Promise<ManualEntry[]> {
  const entries = manualEntries.filter(entry => entry.category !== "condizioni");
  const rows = await activeOverrides("manuale");
  if (!rows.length) return entries;
  const active = activeOverrideMap(rows);
  return entries.map(entry => overlay(entry, manualAdapter, "manuale", entry.id, "2024", active).card);
}
