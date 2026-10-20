import data from "./data/srd-spells-5.1-it.json";
import editionLinks from "./data/spell-edition-links.json";
import { repairSpellText } from "./spell-text-repairs";

type LegacySpellRow = (typeof data.records)[number]["spell"];

const recordsById = new Map(data.records.map(record => [record.spell.id, record]));
const links: Record<string, { id2024: string }> = editionLinks.links;
// Only links whose 2014 spell is already published lead from a 2024 card.
const legacyBy2024 = new Map(Object.entries(links).filter(([id]) => recordsById.has(id)).map(([id, link]) => [link.id2024, id]));
const released = (environment?: string) => environment === "preview" || environment === "production";

export function isLegacySpellId(id: string): boolean {
  return recordsById.has(id);
}

/** The 2014 spells of the SRD 5.1 are read from the project files: the database is never written. */
export function withLegacySpells<T extends { id: string; nome_italiano: string }>(rows: T[], environment?: string): (T | LegacySpellRow)[] {
  if (!released(environment)) return rows;
  const existing = new Set(rows.map(row => row.id));
  const additions = data.records.map(record => record.spell).filter(spell => !existing.has(spell.id));
  return additions.length ? [...rows, ...additions.map(spell => ({ ...spell }))] : rows;
}

export function legacySpellById(id: string, environment?: string): LegacySpellRow | undefined {
  const record = released(environment) ? recordsById.get(id) : undefined;
  return record ? { ...record.spell } : undefined;
}

/** Exact transcriptions only: a later edit loses the source label. */
export function getLegacySpellSource(spell: Partial<Record<keyof LegacySpellRow, string>> & { id: string }) {
  const record = recordsById.get(spell.id);
  if (!record) return undefined;
  const expected = record.spell as Record<keyof LegacySpellRow, string>;
  const fields = Object.keys(expected) as (keyof LegacySpellRow)[];
  // An approved display repair of the description keeps the source label.
  const same = (key: keyof LegacySpellRow) => (spell[key] ?? "") === expected[key]
    || (key === "descrizione" && spell[key] === repairSpellText(spell.id, expected[key]));
  if (!fields.every(same)) return undefined;
  return {
    document: data.document,
    sourceUrl: data.sourceUrl,
    sourceName: record.sourceName,
    page: record.page,
    pages: "pages" in record ? (record.pages as number[]) : [record.page],
  };
}

/** "Versione 2024 →" on a 2014 card, "Versione 2014 →" on its 2024 card; nothing without an approved link. */
export function spellEditionLink(id: string, environment?: string): { href: string; label: string } | undefined {
  if (!released(environment)) return undefined;
  const id2024 = recordsById.has(id) ? links[id]?.id2024 : undefined;
  if (id2024) return { href: `/spell/${id2024}`, label: "Versione 2024" };
  const id2014 = legacyBy2024.get(id);
  return id2014 ? { href: `/spell/${id2014}`, label: "Versione 2014" } : undefined;
}
