import data from "./data/srd-monster-sample.json";
import type { Monster } from "./monsters-types";

/** Preview-only sample: the shared database and production catalog stay untouched. */
export function previewMonsterById(id: string, environment: string | undefined): Monster | undefined {
  return environment === "preview" && id === data.monster.id ? { ...data.monster } : undefined;
}

export function previewMonsters(rows: Monster[], environment: string | undefined): Monster[] {
  if (environment !== "preview" || rows.some((row) => row.id === data.monster.id)) return rows;
  return [...rows, { ...data.monster }].sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

/** Only an unchanged source transcription receives the SRD attribution box. */
export function getSrdMonsterSource(monster: Monster) {
  const actual = monster as unknown as Record<string, unknown>;
  return Object.entries(data.monster).every(([key, value]) => actual[key] === value)
    ? { sourceUrl: data.sourceUrl, page: data.page, sourceName: data.sourceName }
    : undefined;
}
