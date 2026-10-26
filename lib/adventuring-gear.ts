import manualData from "./data/srd-manual-5.2.1-it.json";
import repairs from "./data/adventuring-gear-repairs-20261021.json";

/**
 * Adventuring gear of the SRD 5.2.1 (2024), built from the 2024 manual entry
 * "Equipaggiamento d'avventura": one item per heading "Nome (prezzo)", its prose and the
 * tables printed under it, the weight from the table "Equipaggiamento d'avventura".
 * Display-only repairs (names that differ between heading and table, PDF typos) are listed in
 * adventuring-gear-repairs-20261021.json; the source data is never changed.
 */

export const GEAR_ENTRY_ID = "equipaggiamento-equipaggiamento-d-avventura";
const entry = manualData.entries.find(item => item.id === GEAR_ENTRY_ID)!;

export interface GearTable { title: string; columns: string[]; rows: string[][] }
export interface GearItem {
  id: string;
  nome: string;
  /** As printed in the heading: "2 mo", "variabile", "trucchetto, 30 mo; livello 1, 50 mo". */
  prezzo: string;
  /** From the table "Equipaggiamento d'avventura": "2,5 kg", "—", "Variabile"; undefined if not found. */
  peso?: string;
  paragraphs: string[];
  tables: GearTable[];
  page: number;
  /** "Dotazione da …": the packs. */
  dotazione: boolean;
}

const slug = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const fixText = (text: string) => repairs.testi.reduce((value, fix) => value.split(fix.da).join(fix.a), text);

// Cell patterns read from the right of a row: "1.000 mo", "0,5 kg", "—", "Variabile", "50", "Borsa".
const CELL: Record<string, string> = {
  Costo: "\\d[\\d.]*\\s?(?:mo|ma|mr|me|mp)|Variabile",
  Peso: "\\d[\\d,]*\\s?kg|—|Variabile",
  "Quantità": "\\d+",
  Conservazione: "\\S+",
};

/**
 * A printed table: title line, header, then rows. Each row is read from the right with the pattern
 * of its column; the first column takes the rest. A line that does not match continues the row
 * above: its first column ("pergamene", "ferrato)") or, far to the right, the weight ("(pieno)").
 */
function parseTable(text: string): GearTable {
  const lines = text.split("\n").filter(line => line.trim());
  const title = /\s{2,}/.test(lines[0]) ? "" : lines.shift()!.trim();
  const header = lines.shift()!.trim();
  const known = Object.keys(CELL).filter(name => header.includes(name));
  const columns = [header.slice(0, Math.min(...known.map(name => header.indexOf(name)))).trim(), ...known.sort((a, b) => header.indexOf(a) - header.indexOf(b))];
  const pattern = new RegExp(`^(.*?)${columns.slice(1).map(name => `\\s+(${CELL[name]})`).join("")}\\s*$`);
  const rows: string[][] = [];
  for (const line of lines) {
    const match = pattern.exec(line.trim());
    if (match) { rows.push(match.slice(1).map(cell => cell.trim())); continue; }
    const last = rows[rows.length - 1];
    if (!last) continue;
    const indent = line.length - line.trimStart().length;
    const weightColumn = columns.indexOf("Peso");
    if (indent > 20 && weightColumn > 0) last[weightColumn] += ` ${line.trim()}`;
    else last[0] += ` ${line.trim()}`;
  }
  return { title, columns, rows };
}

function tableRows() {
  return entry.blocks.filter(block => block.kind === "table" && /^(Equipaggiamento d'avventura\n)?Oggetto\s+Peso\s+Costo/.test(block.text))
    .flatMap(block => parseTable(block.text).rows)
    .map(([nome, peso, costo]) => ({ stampato: nome, nome: repairs.nomiTabella[nome as keyof typeof repairs.nomiTabella] ?? nome, peso, costo }));
}

function weights(): Map<string, string> {
  return new Map(tableRows().map(row => [row.nome, row.peso]));
}

/** Rows of the weight table whose cost differs from the price in the item heading. */
export function gearPriceMismatches(): string[] {
  const norm = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
  return tableRows().filter(row => {
    const item = gearItems.find(other => other.nome === row.nome);
    return !item || !norm(item.prezzo).includes(norm(row.costo).replace(/^variabile$/, "variabil"));
  }).map(row => `${row.stampato}: tabella ${row.costo}, titolo ${gearItems.find(other => other.nome === row.nome)?.prezzo ?? "—"}`);
}

const endsSentence = (text: string) => /[.:!?»)"]$/.test(text.trim());

function build(): GearItem[] {
  const weight = weights();
  const items: GearItem[] = [];
  let current: GearItem | undefined;
  for (const block of entry.blocks) {
    if (block.kind === "heading") {
      const match = /^(.*?) \((.*)\)$/.exec(block.text.trim());
      const nome = match ? match[1] : block.text.trim();
      current = { id: slug(nome), nome, prezzo: match ? match[2] : "", peso: weight.get(nome), paragraphs: [], tables: [], page: block.page, dotazione: nome.startsWith("Dotazione da ") };
      items.push(current);
    } else if (current && block.kind === "prose") {
      const text = fixText(block.text.trim());
      const last = current.paragraphs.length - 1;
      // A paragraph cut by a page or column break continues the one before.
      if (last >= 0 && !endsSentence(current.paragraphs[last])) current.paragraphs[last] += ` ${text}`;
      else current.paragraphs.push(text);
    } else if (current && block.kind === "table" && !/Oggetto\s+Peso\s+Costo/.test(block.text)) {
      current.tables.push(parseTable(block.text));
    }
  }
  return items.sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

export const gearItems: GearItem[] = build();

export function getGearItem(id: string) {
  return gearItems.find(item => item.id === id);
}

/** Light rows for the list and its search: no descriptions. */
interface GearListItem { id: string; nome: string; prezzo: string; peso?: string; dotazione: boolean }
export function gearListItems(): GearListItem[] {
  return gearItems.map(({ id, nome, prezzo, peso, dotazione }) => ({ id, nome, prezzo, ...(peso ? { peso } : {}), dotazione }));
}

/** Names of the weight table that match no heading, and headings without a weight. */
export function gearWeightMismatches() {
  const names = new Set(gearItems.map(item => item.nome));
  return { senzaTitolo: [...weights().keys()].filter(name => !names.has(name)), senzaPeso: gearItems.filter(item => !item.peso).map(item => item.nome) };
}
