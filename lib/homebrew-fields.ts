/**
 * The chip fields of the form «Proponi un mostro» (PROMPT 13): damage types, conditions, languages and senses chosen
 * with a tap. What is saved stays plain text, as before («freddo, necrotico»), so the sheets show the same; the text
 * of an older proposal written by hand is read back into chips, and what is not one of the choices is kept as it is.
 * Pure functions, safe in the browser (no data file: only the names).
 */

/** The 13 damage types (the same list as components/admin-monster-field.tsx). */
export const DAMAGE_TYPES = ["acido", "contundente", "forza", "freddo", "fulmine", "fuoco", "necrotico", "perforante", "psichico", "radiante", "tagliente", "tuono", "veleno"] as const;

/** The conditions of the SRD, the same 15 names in 2014 (5.1 with the 4 translated ones) and 2024 (5.2.1). */
const CONDITIONS = ["accecato", "affascinato", "afferrato", "assordato", "avvelenato", "incapacitato", "indebolimento", "invisibile", "paralizzato", "pietrificato", "privo di sensi", "prono", "spaventato", "stordito", "trattenuto"] as const;
export const CONDITIONS_BY_EDITION: Record<"2014" | "2024", readonly string[]> = { "2014": CONDITIONS, "2024": CONDITIONS };

/** The languages of each edition, as the SRD sheets write them. */
export const LANGUAGES_BY_EDITION: Record<"2014" | "2024", readonly string[]> = {
  "2024": ["Comune", "Comune dei Segni", "Draconico", "Elfico", "Gigante", "Gnomesco", "Goblin", "Halfling", "Nanico", "Orchesco", "Abissale", "Celestiale", "Druidico", "Gergo delle Profondità", "Gergo ladresco", "Infernale", "Primordiale", "Silvano", "Sottocomune"],
  "2014": ["Comune", "Nanico", "Elfico", "Gigante", "Gnomesco", "Goblin", "Halfling", "Orchesco", "Abissale", "Celestiale", "Draconico", "Gergo delle Profondità", "Infernale", "Primordiale", "Silvano", "Sottocomune", "Druidico", "Gergo ladresco"],
};

/** The special senses and the distances of the menu (in metres). */
export const SENSES = ["scurovisione", "vista cieca", "percezione tellurica", "vista pura"] as const;
export const SENSE_DISTANCES = [3, 6, 9, 12, 15, 18, 24, 30, 36] as const;

export type ChipList = { selected: string[]; extra: string };

const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("it").replace(/\s+/g, " ").trim();

/** The pieces of a text between commas (or semicolons), each with where it starts. */
function commaPieces(text: string): { piece: string; at: number }[] {
  const result: { piece: string; at: number }[] = [];
  const pattern = /[^,;]+/g;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const piece = match[0].trim();
    if (piece) result.push({ piece, at: match.index + match[0].indexOf(piece) });
  }
  return result;
}

/**
 * A list written as text → the choices it names (in the order of the menu) and the rest. The choices are read from
 * the start while every piece is one («freddo, fulmine e veleno»); from the first piece that is not, the text is kept
 * word for word as the rest («contundente, perforante e tagliente da attacchi non magici» stays as it is after
 * «contundente»): splitting it would change what it says. What this module writes reads back the same.
 */
export function readChips(text: string, options: readonly string[]): ChipList {
  const source = text || "";
  const byKey = new Map(options.map(option => [fold(option), option]));
  const selected = new Set<string>();
  for (const { piece, at } of commaPieces(source)) {
    const named = [byKey.get(fold(piece))];
    const parts = named[0] ? named : piece.split(/\s+e\s+/).map(part => byKey.get(fold(part)));
    if (parts.some(option => !option)) return { selected: options.filter(option => selected.has(option)), extra: source.slice(at).trim() };
    for (const option of parts) selected.add(option!);
  }
  return { selected: options.filter(option => selected.has(option)), extra: "" };
}

/** The choices (in the order of the menu) and the rest → the text saved with the proposal. */
export function writeChips({ selected, extra }: ChipList, options: readonly string[]): string {
  const chosen = options.filter(option => selected.includes(option));
  return [...chosen, ...(extra.trim() ? [extra.trim()] : [])].join(", ");
}

/** One tap on a chip: chosen ↔ not chosen. */
export function toggleChip(list: ChipList, option: string): ChipList {
  return { ...list, selected: list.selected.includes(option) ? list.selected.filter(item => item !== option) : [...list.selected, option] };
}

export type Languages = ChipList & { understandsOnly: boolean };
// «capisce il Comune e il Draconico ma non può parlare» (and the SRD forms «ma non lo parla», «ma non li parla»…).
const UNDERSTANDS = /^capisce\s+(.+?)\s+ma non (?:può parlar\w*|è in grado di parlar\w*|l[oaie] parla)\.?$/i;

/**
 * The languages: the chips, «altra» (the other pieces, as written: «telepatia 36 m») and «Capisce ma non può parlare».
 * The pieces of a list of languages stand on their own, so here a list is split at the commas only.
 */
export function readLanguages(text: string, options: readonly string[]): Languages {
  const match = UNDERSTANDS.exec((text || "").trim());
  const list = match ? match[1].replace(/\b(?:il|lo|la|l['’]|i|gli|le)\s*(?=[A-ZÀ-Ý])/g, "").replace(/\s+e\s+/g, ", ") : (text || "").trim();
  if (list === "—") return { selected: [], extra: "", understandsOnly: false };
  const byKey = new Map(options.map(option => [fold(option), option]));
  const selected = new Set<string>();
  const extra: string[] = [];
  for (const piece of list.split(/[,;]/).map(item => item.trim()).filter(Boolean)) {
    const option = byKey.get(fold(piece));
    if (option) selected.add(option); else extra.push(piece);
  }
  return { selected: options.filter(option => selected.has(option)), extra: extra.join(", "), understandsOnly: !!match };
}

export function writeLanguages(value: Languages, options: readonly string[]): string {
  const list = writeChips(value, options);
  return value.understandsOnly && list ? `capisce ${list} ma non può parlare` : list;
}

export type SenseRow = { sense: string; metres: number };
export type Senses = { rows: SenseRow[]; extra: string };

/** «scurovisione 18 m, vista cieca 3 m»: one row per sense (type and distance), read from the start; the rest kept word for word. */
export function readSenses(text: string): Senses {
  const source = text || "";
  const rows: SenseRow[] = [];
  for (const { piece, at } of commaPieces(source)) {
    const match = /^(.+?)\s+(\d{1,3})\s*m(?:etri)?\.?$/i.exec(piece);
    const sense = match && SENSES.find(name => fold(name) === fold(match[1]));
    if (!sense) return { rows, extra: source.slice(at).trim() };
    rows.push({ sense, metres: Number(match![2]) });
  }
  return { rows, extra: "" };
}

export function writeSenses({ rows, extra }: Senses): string {
  return [...rows.filter(row => row.sense && row.metres > 0).map(row => `${row.sense} ${row.metres} m`), ...(extra.trim() ? [extra.trim()] : [])].join(", ");
}

/** The passive Perception of the sheet: 10 + Perception when written in the skills, else 10 + the Wisdom modifier. */
export function passivePerception(saggezza: number, abilita: string): number {
  const perception = /Percezione\s*([+-−]\s*\d+)/i.exec(abilita || "");
  if (perception) return 10 + Number(perception[1].replace(/[−\s]/g, match => (match === "−" ? "-" : "")));
  return 10 + Math.floor(((Number.isFinite(saggezza) ? saggezza : 10) - 10) / 2);
}
