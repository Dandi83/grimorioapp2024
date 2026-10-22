import manualData from "./data/srd-manual-5.2.1-it.json";
import repairs from "./data/tools-repairs-20261021.json";

/**
 * Tools of the SRD 5.2.1 (2024), built from the 2024 manual entry "Strumenti": one tool per heading
 * "Nome (costo)", its card (Caratteristica, Peso, Utilizzo, Creazione, Varianti) joined across page
 * breaks and hyphenations. Display-only fixes in tools-repairs-20261021.json.
 */

export const TOOLS_ENTRY_ID = "equipaggiamento-strumenti";
const entry = manualData.entries.find(item => item.id === TOOLS_ENTRY_ID)!;

export type ToolGroup2024 = "artigiano" | "altri";
export interface ToolVariant { nome: string; costo: string; peso?: string }
export interface Tool2024 {
  id: string;
  nome: string;
  /** As printed in the heading: "50 mo", "variabile". */
  prezzo: string;
  gruppo: ToolGroup2024;
  caratteristica: string;
  peso: string;
  utilizzo: string;
  creazione: string[];
  varianti: ToolVariant[];
  page: number;
}

export const toolSlug = (name: string) => name.toLowerCase().replace(/\([^)]*\)/g, " ").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const fix = (text: string) => repairs.testi2024.reduce((value, item) => value.split(item.da).join(item.a), text);
/** Commas outside brackets: "Arma da mischia (eccetto randello, …), armatura media". */
export const splitList = (text: string) => text.split(/,\s*(?![^()]*\))/).map(part => part.trim()).filter(Boolean);

/** "Caratteristica: Forza   Peso: 4 kg\nUtilizzo: forzare … conteni-\n tore (CD 20)\nCreazione: …" */
export function parseToolCard(text: string) {
  const flat = fix(text.replace(/-\n\s*/g, "").replace(/\s+/g, " ").trim());
  const fields: Record<string, string> = {};
  const parts = flat.split(/\b(Caratteristica|Peso|Utilizzo|Creazione|Varianti):\s*/);
  for (let i = 1; i < parts.length; i += 2) fields[parts[i]] = parts[i + 1].trim();
  return fields;
}

function variants(text?: string): ToolVariant[] {
  if (!text) return [];
  return splitList(text).map(part => {
    const match = /^(.*?) \(([^,)]+)(?:, ([^)]+))?\)$/.exec(part);
    return match ? { nome: match[1], costo: match[2], ...(match[3] ? { peso: match[3] } : {}) } : { nome: part, costo: "" };
  });
}

function build(): Tool2024[] {
  const tools: Tool2024[] = [];
  let group: ToolGroup2024 | undefined;
  let current: { heading: string; page: number; cards: string[] } | undefined;
  const flush = () => {
    if (!current || !group) return;
    const match = /^(.*?) \((.*)\)$/.exec(current.heading)!;
    const card = parseToolCard(current.cards.join("\n"));
    tools.push({
      id: toolSlug(match[1]), nome: match[1], prezzo: match[2], gruppo: group,
      caratteristica: card.Caratteristica ?? "", peso: card.Peso ?? "", utilizzo: card.Utilizzo ?? "",
      creazione: card.Creazione ? splitList(card.Creazione) : [], varianti: variants(card.Varianti), page: current.page,
    });
    current = undefined;
  };
  for (const block of entry.blocks) {
    if (block.kind === "heading") {
      flush();
      if (block.text === "Strumenti da artigiano") group = "artigiano";
      else if (block.text === "Altri strumenti") group = "altri";
      else if (/\(.*\)$/.test(block.text) && group) current = { heading: block.text, page: block.page, cards: [] };
    } else if (block.kind === "table" && current) {
      // A card cut by a page break continues in the next table block ("quadrelli da balestra, …").
      current.cards.push(block.text);
    }
  }
  flush();
  return tools;
}

export const tools2024: Tool2024[] = build();

/** Prose under a heading of the entry: "Competenza negli strumenti", "Strumenti da artigiano". */
export function toolsSection(heading: string): string[] {
  const start = entry.blocks.findIndex(block => block.kind === "heading" && block.text === heading);
  const out: string[] = [];
  for (const block of entry.blocks.slice(start + 1)) {
    if (block.kind !== "prose") break;
    out.push(block.text);
  }
  return out;
}
