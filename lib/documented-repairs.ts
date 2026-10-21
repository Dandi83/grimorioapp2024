import gearRepairs from "./data/adventuring-gear-repairs-20261021.json";
import magicRepairs from "./data/magic-items-repairs-20261021.json";
import castingTimes from "./data/spell-casting-time-repairs-20261021.json";
import catalogRepairs from "./data/spell-catalog-repairs-20261020.json";
import spellTexts from "./data/spell-text-repairs-20261021.json";
import toolRepairs from "./data/tools-repairs-20261021.json";

/**
 * The display corrections approved before the admin log existed: they live in the
 * *-repairs-*.json files (unchanged) and are listed read-only in /admin/registro.
 */
export interface DocumentedRepair { sezione: string; scheda: string; prima: string; dopo: string; nota: string; file: string }

const entries = <T,>(record: Record<string, T>) => Object.entries(record).filter(([key]) => !key.startsWith("_"));
const short = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 160);

export function documentedRepairs(): DocumentedRepair[] {
  const out: DocumentedRepair[] = [];
  for (const row of magicRepairs.sostituzioni) out.push({ sezione: `Oggetti magici ${row.edizione}`, scheda: row.id, prima: row.prima, dopo: row.dopo, nota: `${row.motivo} PDF p. ${row.pagina}, ${row.dove}.`, file: "magic-items-repairs-20261021.json" });
  for (const [scheda, row] of entries(castingTimes.tempi)) out.push({ sezione: "Incantesimi 2024 · tempo di lancio", scheda, prima: row.da, dopo: row.a, nota: "Estrazione del testo rovinata.", file: "spell-casting-time-repairs-20261021.json" });
  for (const [scheda, livello] of entries(catalogRepairs.livelli)) out.push({ sezione: "Incantesimi 2024 · livello", scheda, prima: "illeggibile", dopo: String(livello), nota: "Livello non leggibile nel catalogo.", file: "spell-catalog-repairs-20261020.json" });
  for (const [scheda, row] of entries(catalogRepairs.nomi)) out.push({ sezione: "Incantesimi 2024 · nome", scheda, prima: row.da, dopo: row.a, nota: "Nome rovinato nel catalogo.", file: "spell-catalog-repairs-20261020.json" });
  for (const [scheda, row] of entries(spellTexts.testi)) for (const change of row.sostituzioni) out.push({ sezione: "Incantesimi · testo", scheda, prima: short(change.da), dopo: short(change.a), nota: "Sillabazione o a capo del PDF.", file: "spell-text-repairs-20261021.json" });
  for (const [prima, dopo] of entries(gearRepairs.nomiTabella)) out.push({ sezione: "Equipaggiamento d’avventura 2024 · nome in tabella", scheda: dopo, prima, dopo, nota: "Nome della tabella allineato al titolo della voce.", file: "adventuring-gear-repairs-20261021.json" });
  for (const row of [...gearRepairs.testi, ...gearRepairs.testi2014]) out.push({ sezione: "Equipaggiamento d’avventura", scheda: "—", prima: row.da, dopo: row.a, nota: row.nota, file: "adventuring-gear-repairs-20261021.json" });
  for (const row of [...toolRepairs.testi2024, ...toolRepairs.testi2014] as { da: string; a: string; nota: string }[]) out.push({ sezione: "Strumenti", scheda: "—", prima: row.da, dopo: row.a, nota: row.nota, file: "tools-repairs-20261021.json" });
  return out;
}
