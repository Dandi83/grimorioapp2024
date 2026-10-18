import data from "./data/srd-monsters-5.2.1-it.json";
import animals from "./data/srd-animals-5.2.1-it.json";
import legacy from "./data/srd-monsters-5.1-it.json";
import type { Monster } from "./monsters-types";

const currentRecords = [...data.records, ...animals.records];
const previewRecords = [...currentRecords, ...legacy.records];
const recordsById = new Map(previewRecords.map(record => [record.monster.id, record]));
const legacyIds = new Set(legacy.records.map(record => record.monster.id));
/** Rules edition stays isolated even when a later edit invalidates exact attribution. */
export function usesLegacyMonsterRules(monster: Pick<Monster, "id" | "edizione">): boolean {
  return monster.edizione ? monster.edizione === "2014" : legacyIds.has(monster.id);
}
function available(environment: string | undefined): Monster[] {
  if (environment === "preview" || environment === "production") return previewRecords.map(record => record.monster);
  return [];
}

/** Approved catalog is available in preview and production without changing the shared DB. */
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
  const fields = new Set([...Object.keys(expected), "azioni_bonus", "attrezzatura", "immunita", "sottotitolo_fonte", "iniziativa", "bonus_competenza"]);
  const isLegacy = legacyIds.has(monster.id);
  return [...fields].every(key => (actual[key] ?? "") === (expected[key] ?? ""))
    ? {
      document: isLegacy ? legacy.document : "SRD 5.2.1",
      edition: isLegacy ? legacy.edition : "2024",
      sourceUrl: isLegacy ? legacy.sourceUrl : data.sourceUrl,
      page: record.page,
      sourceName: record.sourceName,
      adaptation: "adaptation" in record ? String(record.adaptation) : undefined,
      pages: "pages" in record ? record.pages as number[] : [record.page],
    }
    : undefined;
}
