import { conditions, legacyConditions } from "./conditions";
import type { EquipmentEdition } from "./equipment-types";

/** A row of the Condizioni list: the condition (its id in /admin/contenuti/condizioni), the printed name and its page. */
export interface ConditionRow { id: string; nome: string; href: string }

const rows = (entries: { id: string; title: string }[]) =>
  entries.map(entry => ({ id: entry.id, nome: entry.title, href: `/manuale/${entry.id}` })).sort((a, b) => a.nome.localeCompare(b.nome, "it"));

/**
 * Conditions per edition, read from the data: 2024 from the SRD 5.2.1 manual, 2014 from the SRD 5.1
 * (11 conditions: Prono, Spaventato, Stordito and Trattenuto are not printed there).
 */
export function conditionRows(shown: { "2024": { id: string; title: string }[]; "2014": { id: string; title: string }[] } = { "2024": conditions, "2014": legacyConditions }): Record<EquipmentEdition, ConditionRow[]> {
  return { "2024": rows(shown["2024"]), "2014": rows(shown["2014"]) };
}

/** 2024 conditions not printed in the SRD 5.1: named under the 2014 list, linked to their 2024 pages. */
export function conditionsOnly2024(): ConditionRow[] {
  const printed2014 = new Set(legacyConditions.map(entry => entry.title));
  return rows(conditions).filter(row => !printed2014.has(row.nome));
}
