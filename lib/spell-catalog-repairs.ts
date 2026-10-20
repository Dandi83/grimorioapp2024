import repairs from "./data/spell-catalog-repairs-20261020.json";
import timeRepairs from "./data/spell-casting-time-repairs-20261021.json";
import { parseLivello } from "./spells-types";

const levels: Record<string, number> = repairs.livelli;
const names: Record<string, { da: string; a: string }> = repairs.nomi;
const times: Record<string, { da: string; a: string }> = timeRepairs.tempi;
const LEVEL_WORDS = /di\s+\d*\s*[°º]?\s*livello/i;

/**
 * Display-only repair of approved catalog values: the database is never written.
 * A value is replaced only while it is still unreadable (level) or still the damaged original (name),
 * so every later correction made in the reserved area wins.
 */
export function repairCatalogSpell<T extends { id: string; nome_italiano: string; livello?: string | null; tempo_di_lancio?: string | null }>(row: T): T {
  let repaired = row;
  const level = levels[row.id];
  if (level !== undefined && row.livello) {
    const current = parseLivello(row.livello).livello_num;
    if ((current < 0 || current > 9) && LEVEL_WORDS.test(row.livello)) {
      repaired = { ...repaired, livello: row.livello.replace(LEVEL_WORDS, `di ${level}º livello`) };
    }
  }
  const name = names[row.id];
  if (name && row.nome_italiano === name.da) repaired = { ...repaired, nome_italiano: name.a };
  // Casting times broken by the PDF text layer: the value shown on the card, only while still broken.
  const time = times[row.id];
  if (time && row.tempo_di_lancio === time.da) repaired = { ...repaired, tempo_di_lancio: time.a };
  return repaired;
}

export const catalogRepairs = { ...repairs, tempi: timeRepairs.tempi };
