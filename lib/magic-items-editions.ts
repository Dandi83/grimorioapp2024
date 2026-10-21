import repairs from "./data/magic-items-repairs-20261021.json";
import { magicItemHref, magicItems, type MagicItem } from "./magic-items";
import { rarityCategories, type MagicItemEdition, type MagicItemListRow } from "./magic-items-types";

/**
 * One entry per magic item across the two editions. Two items are the same item when their names
 * match ignoring case and brackets, or when Daniele's list of the 14 renamed items says so
 * ("Piuma magica" → "Piuma di Quaal"). The 2024 item keeps its address; a 2014 item with a different
 * name has its own address from the 2014 name, which opens the 2014 edition.
 */
export interface MagicItemEntry {
  id: string;
  /** Own address of the 2014 item when its name differs from the 2024 one ("piuma-magica"). */
  id2014?: string;
  editions: { "2014"?: MagicItem; "2024"?: MagicItem };
}

const pairs = repairs.abbinamenti2014 as Record<string, string>;
export const magicItemKey = (name: string) => name.toLowerCase().replace(/\([^)]*\)/g, "").replace(/’/g, "'").replace(/\s+/g, " ").trim();

function counterpart(item: MagicItem): MagicItem | undefined {
  const target = pairs[item.nomeStampato ?? item.nome] ?? pairs[item.nome];
  if (target) return magicItems["2024"].find(other => other.nome === target);
  return magicItems["2024"].find(other => magicItemKey(other.nome) === magicItemKey(item.nome));
}

function build(): MagicItemEntry[] {
  const entries: MagicItemEntry[] = magicItems["2024"].map(item => ({ id: item.id, editions: { "2024": item } }));
  for (const item of magicItems["2014"]) {
    const other = counterpart(item);
    const entry = other && entries.find(candidate => candidate.editions["2024"] === other);
    if (entry) {
      if (entry.editions["2014"]) throw new Error(`two 2014 items for ${other!.nome}`);
      entry.editions["2014"] = item;
      if (magicItemKey(item.nome) !== magicItemKey(other!.nome)) entry.id2014 = item.id;
    } else {
      entries.push({ id: item.id, editions: { "2014": item } });
    }
  }
  return entries;
}

export const magicItemEntries: MagicItemEntry[] = build();

export function findMagicItemEntry(id: string): { entry: MagicItemEntry; edition?: MagicItemEdition } | undefined {
  const byAlias = magicItemEntries.find(entry => entry.id2014 === id);
  if (byAlias) return { entry: byAlias, edition: "2014" };
  const entry = magicItemEntries.find(item => item.id === id);
  return entry && { entry, ...(entry.id2014 ? { edition: "2024" as const } : {}) };
}

export const magicItemEntryHref = (entry: MagicItemEntry, edition: MagicItemEdition) =>
  magicItemHref(edition === "2014" && entry.id2014 ? entry.id2014 : entry.id);

export interface MagicItemChange { label: "Nome" | "Rarità" | "Sintonia"; before: string; after: string }

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
/** "Richiesta con un nano", "Non richiesta": the filter labels with the printed requirement. */
const attunement = (item: MagicItem) => item.sintonia ? `Richiesta${item.requisitoSintonia ? ` ${item.requisitoSintonia}` : ""}` : "Non richiesta";

/**
 * "2014 → 2024" rows, computed from the data: the name when the two names differ, the rarity when
 * its rarities differ (not when only the order of the printed text does), the attunement when it is
 * required in one edition only or with another requirement.
 */
export function compareMagicItem(entry: MagicItemEntry): MagicItemChange[] {
  const before = entry.editions["2014"], after = entry.editions["2024"];
  if (!before || !after) return [];
  const rows: MagicItemChange[] = [];
  if (magicItemKey(before.nome) !== magicItemKey(after.nome)) rows.push({ label: "Nome", before: before.nome, after: after.nome });
  const rarities = (item: MagicItem) => rarityCategories(item.rarita).join(",");
  if (rarities(before) !== rarities(after)) rows.push({ label: "Rarità", before: capital(before.rarita), after: capital(after.rarita) });
  if (attunement(before) !== attunement(after)) rows.push({ label: "Sintonia", before: attunement(before), after: attunement(after) });
  return rows;
}

/** 2024 items named by Daniele as the counterparts of a 2014 item besides its pair ("Sfera di cristallo"). */
export function seeAlso(entry: MagicItemEntry): MagicItemEntry[] {
  const item = entry.editions["2014"];
  const names = item ? (repairs.vediAnche["2014"] as Record<string, string[]>)[item.nome] ?? [] : [];
  return names.map(name => magicItemEntries.find(other => other.editions["2024"]?.nome === name)!);
}

export function magicItemEditionRows(): Record<MagicItemEdition, MagicItemListRow[]> {
  const rows = (edition: MagicItemEdition) => magicItemEntries.filter(entry => entry.editions[edition]).map(entry => {
    const item = entry.editions[edition]!;
    return {
      id: item.id, href: magicItemEntryHref(entry, edition), nome: item.nome, tipo: item.tipo,
      rarita: item.rarita, rarita_categorie: rarityCategories(item.rarita), sintonia: item.sintonia,
    };
  }).sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  return { "2014": rows("2014"), "2024": rows("2024") };
}
