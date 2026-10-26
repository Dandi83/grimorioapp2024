import data from "./data/srd-adventuring-gear-5.1-it.json";
import repairs from "./data/adventuring-gear-repairs-20261021.json";

/**
 * Adventuring gear of the SRD 5.1 (2014), from srd-adventuring-gear-5.1-it.json (transcribed from
 * the PDF by scripts/transcribe-srd-equipment.py gear2014): one item per table row, one item per
 * group (Focus arcano, Focus druidico, Munizioni, Simbolo sacro) with its rows, the seven packs.
 * Descriptions are matched to the rows by name; display-only fixes in the repairs file.
 */

export interface Gear2014Row { nome: string; costo: string; peso: string }
export interface Gear2014Item {
  id: string;
  /** As printed in the table: "Acido (fiala)", "Corda di Canapa (15 metri)". */
  nome: string;
  costo?: string;
  peso?: string;
  paragraphs: string[];
  /** Rows of a group: "Bacchetta · 10 mo · 0,5 kg". */
  righe?: Gear2014Row[];
  capienza?: string;
  capienzaNota?: string;
  page: number;
  dotazione: boolean;
  gruppo: boolean;
}

export const gear2014Source = data.fonte;

/** Name for matching: lower case, no brackets, no asterisk. */
export const gearKey = (name: string) => name.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/\*/g, "").replace(/\s+/g, " ").trim();
const gearSlug = (name: string) => gearKey(name).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const fix = (text: string) => repairs.testi2014.reduce((value, item) => value.split(item.da).join(item.a), text);

/** The description of a row: same name, else the longest description name the row starts with ("Corda" → "Corda di Seta"). */
function findByName<T>(name: string, entries: [string, T][]): T | undefined {
  const key = gearKey(name);
  const exact = entries.find(([label]) => gearKey(label) === key);
  if (exact) return exact[1];
  return entries.filter(([label]) => key.startsWith(`${gearKey(label)} `)).sort((a, b) => b[0].length - a[0].length)[0]?.[1];
}

const descriptions = Object.entries(data.descrizioni) as [string, { testo: string; page: number }][];
const capacity = data.capienza.righe.map(row => [row.contenitore, row] as [string, typeof row]);

function build(): Gear2014Item[] {
  const items: Gear2014Item[] = [];
  const groups = new Map<string, Gear2014Item>();
  for (const row of data.tabella) {
    if (row.gruppo) {
      let group = groups.get(row.gruppo);
      if (!group) {
        const text = findByName(row.gruppo, descriptions);
        group = { id: gearSlug(row.gruppo), nome: row.gruppo, paragraphs: text ? fix(text.testo).split("\n\n") : [], righe: [], page: row.page, dotazione: false, gruppo: true };
        groups.set(row.gruppo, group);
        items.push(group);
      }
      group.righe!.push({ nome: row.nome, costo: row.costo, peso: row.peso });
      continue;
    }
    const text = findByName(row.nome, descriptions);
    const room = findByName(row.nome, capacity);
    items.push({
      id: gearSlug(row.nome), nome: row.nome, costo: row.costo, peso: row.peso,
      paragraphs: text ? fix(text.testo).split("\n\n") : [], page: text?.page ?? row.page, dotazione: false, gruppo: false,
      ...(room ? { capienza: room.capienza, ...(room.contenitore.endsWith("*") ? { capienzaNota: data.capienza.nota.replace(/^\*\s*/, "") } : {}) } : {}),
    });
  }
  for (const pack of data.dotazioni.voci)
    items.push({ id: gearSlug(pack.nome), nome: pack.nome, costo: pack.prezzo, paragraphs: [fix(pack.testo)], page: pack.page, dotazione: true, gruppo: false });
  return items.sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

export const gear2014Items: Gear2014Item[] = build();

/** Table rows that received a description, and descriptions that matched no row (both checked by the tests). */
export function gear2014TextMatches() {
  const names = data.tabella.map(row => row.gruppo ?? row.nome);
  return {
    conTesto: data.tabella.filter(row => !row.gruppo && findByName(row.nome, descriptions)).map(row => row.nome),
    testiSenzaRiga: descriptions.map(([label]) => label).filter(label => !names.some(name => findByName(name, [[label, true]]))),
    capienzaSenzaRiga: capacity.map(([name]) => name).filter(name => !names.some(row => findByName(row, [[name, true]]))),
  };
}
