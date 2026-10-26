import data from "./data/srd-spells-5.1-it.json";
import { repairSpellText } from "./spell-text-repairs";

type LegacySpellRow = (typeof data.records)[number]["spell"];

const recordsById = new Map(data.records.map(record => [record.spell.id, record]));
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

/** A field of an SRD card that no longer matches its record, with the exact SRD value. */
export interface SrdDifference { field: string; srd: string }

/**
 * The fields of a 2014 spell that differ from its SRD 5.1 record (undefined: no record with that id). The rule
 * of the source label: an empty list keeps it (getLegacySpellSource), so the two can never disagree.
 */
export function legacySpellDifferences(spell: Partial<Record<keyof LegacySpellRow, string>> & { id: string }): SrdDifference[] | undefined {
  const record = recordsById.get(spell.id);
  if (!record) return undefined;
  const expected = record.spell as Record<keyof LegacySpellRow, string>;
  const fields = Object.keys(expected) as (keyof LegacySpellRow)[];
  // An approved display repair of the description keeps the source label.
  const same = (key: keyof LegacySpellRow) => (spell[key] ?? "") === expected[key]
    || (key === "descrizione" && spell[key] === repairSpellText(spell.id, expected[key]));
  return fields.filter(key => !same(key)).map(key => ({ field: key, srd: expected[key] }));
}

/** Exact transcriptions only: a later edit loses the source label. */
export function getLegacySpellSource(spell: Partial<Record<keyof LegacySpellRow, string>> & { id: string }) {
  const record = recordsById.get(spell.id);
  if (!record || legacySpellDifferences(spell)?.length !== 0) return undefined;
  return {
    document: data.document,
    sourceUrl: data.sourceUrl,
    sourceName: record.sourceName,
    page: record.page,
    pages: "pages" in record ? (record.pages as number[]) : [record.page],
  };
}
