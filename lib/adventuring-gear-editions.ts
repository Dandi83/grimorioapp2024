import repairs from "./data/adventuring-gear-repairs-20261021.json";
import { gearItems, type GearItem } from "./adventuring-gear";
import { gear2014Items, gearKey, type Gear2014Item } from "./adventuring-gear-2014";
import type { EquipmentEdition } from "./equipment-types";

/**
 * One entry per object across the two editions. Two items are the same object only when their
 * names match ignoring case and brackets ("Acido (fiala)" = "Acido"), or when Daniele's list says so
 * ("Canestro" → "Cesto"). The 2024 item keeps its address; a 2014 item with a different name gets
 * its own address from the 2014 name, which opens the 2014 edition.
 */
interface GearEntry {
  /** Address of the entry: the 2024 id when the object exists in 2024, else the 2014 one. */
  id: string;
  /** Own address of the 2014 item when its name differs from the 2024 one ("canestro"). */
  id2014?: string;
  editions: { "2014"?: Gear2014Item; "2024"?: GearItem };
}

const pairs = repairs.abbinamenti2014 as Record<string, string>;
// Names printed in the 2024 table besides the heading ("Acciarino e pietra focaia", "Veleno, base").
const tableNames2024 = Object.entries(repairs.nomiTabella).map(([table, heading]) => [gearKey(table), heading] as const);

function counterpart(item: Gear2014Item): GearItem | undefined {
  const target = pairs[item.nome];
  if (target) return gearItems.find(other => other.nome === target);
  const key = gearKey(item.nome);
  return gearItems.find(other => gearKey(other.nome) === key)
    ?? gearItems.find(other => tableNames2024.some(([table, heading]) => table === key && heading === other.nome));
}

function build(): GearEntry[] {
  const entries: GearEntry[] = gearItems.map(item => ({ id: item.id, editions: { "2024": item } }));
  for (const item of gear2014Items) {
    const other = counterpart(item);
    const entry = other && entries.find(candidate => candidate.editions["2024"] === other);
    if (entry) {
      if (entry.editions["2014"]) throw new Error(`two 2014 items for ${other!.nome}`);
      entry.editions["2014"] = item;
      if (gearKey(item.nome) !== gearKey(other!.nome)) entry.id2014 = item.id;
    } else {
      entries.push({ id: item.id, editions: { "2014": item } });
    }
  }
  return entries;
}

export const gearEntries: GearEntry[] = build();

export function findGearEntry(id: string, list: GearEntry[] = gearEntries): { entry: GearEntry; edition?: EquipmentEdition } | undefined {
  const byAlias = list.find(entry => entry.id2014 === id);
  if (byAlias) return { entry: byAlias, edition: "2014" };
  const entry = list.find(item => item.id === id);
  return entry && { entry, ...(entry.id2014 ? { edition: "2024" as const } : {}) };
}

export const gearHref = (entry: GearEntry, edition: EquipmentEdition) =>
  `/equipaggiamento/avventura/${edition === "2014" && entry.id2014 ? entry.id2014 : entry.id}`;

export interface CompareRow { label: string; before: string; after: string }

/** "2014 → 2024" rows that change: name (only for paired names), cost and weight when both are printed. */
export function compareGear(entry: GearEntry): CompareRow[] {
  const before = entry.editions["2014"], after = entry.editions["2024"];
  if (!before || !after) return [];
  const rows: CompareRow[] = [];
  if (gearKey(before.nome) !== gearKey(after.nome)) rows.push({ label: "Nome", before: before.nome, after: after.nome });
  const norm = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();
  if (before.costo && after.prezzo && norm(before.costo) !== norm(after.prezzo)) rows.push({ label: "Costo", before: before.costo, after: after.prezzo });
  if (before.peso && after.peso && norm(before.peso) !== norm(after.peso)) rows.push({ label: "Peso", before: before.peso, after: after.peso });
  return rows;
}

/** Light rows of the list, per edition: no descriptions. */
export interface GearListRow {
  /** The entry (its id in /admin/contenuti/avventura). */
  id: string;
  href: string;
  nome: string;
  prezzo?: string;
  peso?: string;
  dotazione: boolean;
  /** Rows of a 2014 group, shown inside its card. */
  righe?: { nome: string; costo: string; peso: string }[];
}

export function gearListRows(list: GearEntry[] = gearEntries): Record<EquipmentEdition, GearListRow[]> {
  const rows = (edition: EquipmentEdition) => list.filter(entry => entry.editions[edition]).map(entry => {
    const item = entry.editions[edition]!;
    const base = { id: entry.id, href: gearHref(entry, edition), nome: item.nome, dotazione: item.dotazione };
    if (edition === "2024") { const it = item as GearItem; return { ...base, prezzo: it.prezzo, ...(it.peso ? { peso: it.peso } : {}) }; }
    const it = item as Gear2014Item;
    return { ...base, ...(it.costo ? { prezzo: it.costo } : {}), ...(it.peso ? { peso: it.peso } : {}), ...(it.righe ? { righe: it.righe } : {}) };
  }).sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  return { "2014": rows("2014"), "2024": rows("2024") };
}
