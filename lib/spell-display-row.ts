import { applyOriginalDescription } from "./original-descriptions";
import { repairCatalogSpell } from "./spell-catalog-repairs";
import { applySrdDescription } from "./srd-descriptions";

/**
 * The values of a spell row as the public card shows them: display repairs of the catalog, then the SRD 5.2.1
 * record or the original summary when the stored description is still theirs (level, school, casting time,
 * duration come with it). The list (lib/spell-index.ts) and the card (lib/spells.ts) read the same values.
 * repair: false for the reserved area, which edits the stored values.
 */
export function displaySpellRow<T extends { id: string; nome_italiano: string; descrizione: string; livello?: string | null; tempo_di_lancio?: string | null }>(row: T, repair = true): T {
  return applyOriginalDescription(applySrdDescription(repair ? repairCatalogSpell(row) : row));
}
