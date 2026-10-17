import sample from "./data/srd-monster-sample.json";
import data from "./data/srd-monsters-5.2.1-it.json";
import type { Monster } from "./monsters-types";

const previewRecords = data.records;
const recordsById = new Map(previewRecords.map(record => [record.monster.id, record]));
function available(environment: string | undefined): Monster[] {
  if (environment === "preview") return previewRecords.map(record => record.monster);
  if (environment === "production") return [sample.monster];
  return [];
}

/** Expanded catalog is preview-only. The shared DB and approved production catalog stay intact. */
export function previewMonsterById(id: string, environment: string | undefined): Monster | undefined {
  const monster = available(environment).find(monster => monster.id === id);
  return monster ? { ...monster } : undefined;
}

export function previewMonsters(rows: Monster[], environment: string | undefined): Monster[] {
  const existing = new Set(rows.map(row => row.id));
  const additions = available(environment).filter(monster => !existing.has(monster.id));
  if (!additions.length) return rows;
  return [...rows, ...additions.map(monster => ({ ...monster }))].sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

/** Optional content fields must also match: an edited record never receives exact-source attribution. */
export function getSrdMonsterSource(monster: Monster) {
  const record = recordsById.get(monster.id);
  if (!record) return undefined;
  const actual = monster as unknown as Record<string, unknown>;
  const expected = record.monster as unknown as Record<string, unknown>;
  const fields = new Set([...Object.keys(expected), "azioni_bonus", "attrezzatura", "immunita", "sottotitolo_fonte"]);
  return [...fields].every(key => (actual[key] ?? "") === (expected[key] ?? ""))
    ? { sourceUrl: data.sourceUrl, page: record.page, sourceName: record.sourceName }
    : undefined;
}
