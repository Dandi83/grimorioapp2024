import data from "./data/srd-italiano-5.2.1.json";
import manifest from "./data/srd-additions-20261017.json";
import { originalFileRows } from "./original-descriptions";

const srdAdditions = manifest.spells.map(({ id }) => {
  const source = data.spells.find((spell) => spell.id === id);
  if (!source) throw new Error(`Missing SRD addition: ${id}`);
  return {
    id,
    nome_italiano: source.appName,
    livello: source.livello,
    tempo_di_lancio: source.tempo_di_lancio,
    gittata: source.gittata,
    componenti: source.componenti,
    durata: source.durata,
    descrizione: source.descrizione,
  };
});
// With the four original summaries added on 28/10/2026 (lib/original-descriptions.ts), also read from the files.
const additions = [...srdAdditions, ...originalFileRows];

/** Serve the twenty approved SRD records and the four added summaries without mutating database rows. */
export function previewSpellRows<T extends { id: string; nome_italiano: string }>(rows: T[], environment?: string) {
  if (environment !== "preview" && environment !== "production") return rows;
  const existing = new Set(rows.map((row) => row.id));
  return [...rows, ...additions.filter((row) => !existing.has(row.id))]
    .sort((a, b) => a.nome_italiano.localeCompare(b.nome_italiano, "it"));
}

export function previewSpellById(id: string, environment?: string) {
  return (environment === "preview" || environment === "production") ? additions.find((row) => row.id === id) : undefined;
}
