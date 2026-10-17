import data from "./data/srd-monster-sample.json";
import type { Monster } from "./monsters-types";

/** Approved Aboleth release: available in preview and production, without database writes. */
export function previewMonsterById(id: string, environment: string | undefined): Monster | undefined {
  return (environment === "preview" || environment === "production") && id === data.monster.id ? { ...data.monster } : undefined;
}

export function previewMonsters(rows: Monster[], environment: string | undefined): Monster[] {
  if ((environment !== "preview" && environment !== "production") || rows.some((row) => row.id === data.monster.id)) return rows;
  return [...rows, { ...data.monster }].sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

/** Only an unchanged source transcription receives the SRD attribution box. */
export function getSrdMonsterSource(monster: Monster) {
  const actual = monster as unknown as Record<string, unknown>;
  return Object.entries(data.monster).every(([key, value]) => actual[key] === value)
    ? { sourceUrl: data.sourceUrl, page: data.page, sourceName: data.sourceName }
    : undefined;
}
