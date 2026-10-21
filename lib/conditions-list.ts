import { conditions, legacyConditions } from "./conditions";
import type { EquipmentEdition } from "./equipment-types";

/** A row of the Condizioni list: the printed name and the existing condition page. */
export interface ConditionRow { nome: string; href: string }

const rows = (entries: { id: string; title: string }[]) =>
  entries.map(entry => ({ nome: entry.title, href: `/manuale/${entry.id}` })).sort((a, b) => a.nome.localeCompare(b.nome, "it"));

/**
 * Conditions per edition, read from the data: 2024 from the SRD 5.2.1 manual, 2014 from the SRD 5.1
 * (11 conditions: Prono, Spaventato, Stordito and Trattenuto are not printed there).
 */
export function conditionRows(): Record<EquipmentEdition, ConditionRow[]> {
  return { "2024": rows(conditions), "2014": rows(legacyConditions) };
}

/** 2024 conditions not printed in the SRD 5.1: named under the 2014 list, linked to their 2024 pages. */
export function conditionsOnly2024(): ConditionRow[] {
  const printed2014 = new Set(legacyConditions.map(entry => entry.title));
  return rows(conditions).filter(row => !printed2014.has(row.nome));
}
