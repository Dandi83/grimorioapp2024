import { createHash } from "node:crypto";
import data from "./data/original-descriptions-2024.json";

const descriptions = new Map(data.spells.map((spell) => [spell.id, spell]));
const approvedReplacements = new Map(data.replacements.map((spell) => [spell.id, spell.previousDescriptionSha256]));

/** Fill empty rows and the ten approved exact legacy texts; later edits win. */
export function applyOriginalDescription<T extends { id: string; descrizione: string }>(row: T): T {
  const source = descriptions.get(row.id);
  if (!source) return row;
  if (row.descrizione?.trim()) {
    const approvedHash = approvedReplacements.get(row.id);
    if (!approvedHash || createHash("sha256").update(row.descrizione).digest("hex") !== approvedHash) return row;
  }
  return {
    ...row,
    descrizione: source.descrizione,
    livello: source.livello,
    tempo_di_lancio: source.tempo_di_lancio,
    gittata: source.gittata,
    componenti: source.componenti,
    durata: source.durata,
  };
}

/** Never attach the summary's source or creature statistics to a later custom edit. */
export function getOriginalSource(id: string, description: string) {
  const source = descriptions.get(id);
  return source?.descrizione === description ? source : undefined;
}
