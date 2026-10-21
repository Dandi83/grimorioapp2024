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
