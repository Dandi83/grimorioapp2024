import { createHash } from "node:crypto";
import data from "./data/srd-italiano-5.2.1.json";
import review from "./data/srd-revisions-20261017.json";
import { repairSpellText } from "./spell-text-repairs";

const descriptions = new Map(data.spells.map((spell) => [spell.id, spell]));
const approvedReplacements = new Map(review.replacements.map((spell) => [spell.id, spell.previousDescriptionSha256]));

/** Only the 78 audited legacy texts may be replaced; later editorial edits win. */
export function applySrdDescription<T extends { id: string; descrizione: string }>(row: T): T {
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
    // Repair the three audited OCR titles without changing IDs or favorites.
    ...(["i-re-spirare-sott-acqua", "i-re-spirare-sott-acqua-2", "veleni"].includes(row.id)
      ? { nome_italiano: source.sourceName.toLocaleUpperCase("it-IT") }
      : {}),
  };
}

/** Only an exact source transcription receives the SRD source label. */
export function getSrdSource(id: string, description: string) {
  const source = descriptions.get(id);
  // An approved display repair of the same text keeps the source label.
  return source && (source.descrizione === description || repairSpellText(id, source.descrizione) === description) ? source : undefined;
}

export const srdAttribution = data.attribution;
export const srdSourceUrl = data.sourceUrl;
