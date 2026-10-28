import { createHash } from "node:crypto";
import data from "./data/original-descriptions-2024.json";

type OriginalSpell = (typeof data.spells)[number] & { edizione?: string; addedAt?: string; statBlockSummary?: string; statBlockUrl?: string };

const spells: OriginalSpell[] = data.spells;
const descriptions = new Map(spells.map((spell) => [spell.id, spell]));
// The approved earlier texts of a summary: the ten legacy texts (17/10/2026) and the summaries rewritten later.
const approvedReplacements = new Map<string, Set<string>>();
for (const { id, previousDescriptionSha256 } of [...data.replacements, ...data.revisions])
  approvedReplacements.set(id, (approvedReplacements.get(id) ?? new Set()).add(previousDescriptionSha256));

/** Fill empty rows and the approved exact earlier texts; later edits win. */
export function applyOriginalDescription<T extends { id: string; descrizione: string }>(row: T): T {
  const source = descriptions.get(row.id);
  if (!source) return row;
  if (row.descrizione?.trim()) {
    const approved = approvedReplacements.get(row.id);
    if (!approved?.has(createHash("sha256").update(row.descrizione).digest("hex"))) return row;
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

/** The edition of a summary of the files: «2014» for the one written for the 2014 rules, else 2024. */
export function originalEdition(id: string): "2014" | "2024" | undefined {
  const source = descriptions.get(id);
  return source ? (source.edizione === "2014" ? "2014" : "2024") : undefined;
}

/**
 * The summaries added on 28/10/2026 have no database row: the site reads them from the file, like the SRD
 * additions (lib/srd-additions.ts), so nothing is written to the database. Their first save in the reserved
 * area creates the row.
 */
export const originalFileRows = spells.filter(spell => spell.addedAt).map(({ id, nome_italiano, livello, tempo_di_lancio, gittata, componenti, durata, descrizione }) =>
  ({ id, nome_italiano, livello, tempo_di_lancio, gittata, componenti, durata, descrizione }));
