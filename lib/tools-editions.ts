import repairs from "./data/tools-repairs-20261021.json";
import { tools2014, type Tool2014 } from "./tools-2014";
import { tools2024, type Tool2024, type ToolVariant } from "./tools";
import type { EquipmentEdition } from "./equipment-types";

/**
 * One entry per tool across the editions, paired only by name (case and brackets ignored). In 2014
 * every game and musical instrument is a row of its own; in 2024 they are variants of "Gioco" and
 * "Strumento musicale": a 2014 row is linked to a variant only when the variant has the same name,
 * or when Daniele's list says so ("Mazzo di carte" → "carte da gioco").
 */
export interface ToolEntry {
  id: string;
  editions: { "2014"?: Tool2014; "2024"?: Tool2024 };
  /** 2014 game or instrument that is a variant of a 2024 tool. */
  variante?: { tool: Tool2024; variant: ToolVariant };
}

export const toolKey = (name: string) => name.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
const pairs = repairs.abbinamenti2014 as Record<string, string>;

function build(): ToolEntry[] {
  const entries: ToolEntry[] = tools2024.map(tool => ({ id: tool.id, editions: { "2024": tool } }));
  for (const tool of tools2014) {
    const same = entries.find(entry => entry.editions["2024"] && toolKey(entry.editions["2024"].nome) === toolKey(tool.nome));
    if (same) { same.editions["2014"] = tool; continue; }
    const wanted = toolKey(pairs[tool.nome] ?? tool.nome);
    const parent = tools2024.find(other => other.varianti.some(variant => toolKey(variant.nome) === wanted));
    const variant = parent?.varianti.find(item => toolKey(item.nome) === wanted);
    entries.push({ id: tool.id, editions: { "2014": tool }, ...(parent && variant ? { variante: { tool: parent, variant } } : {}) });
  }
  return entries;
}

export const toolEntries: ToolEntry[] = build();
export const getToolEntry = (id: string, list: ToolEntry[] = toolEntries) => list.find(entry => entry.id === id);
export const toolHref = (id: string) => `/equipaggiamento/strumenti/${id}`;

export interface ToolCompareRow { label: string; before: string; after: string }
const norm = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

/** "2014 → 2024": only rows that change; for a 2014 instrument or game, its 2024 variant. */
export function compareTool(entry: ToolEntry): ToolCompareRow[] {
  const before = entry.editions["2014"];
  if (!before) return [];
  const after = entry.editions["2024"];
  const target = after ? { nome: after.nome, costo: after.prezzo, peso: after.peso } : entry.variante?.variant;
  if (!target) return [];
  const rows: ToolCompareRow[] = [];
  if (toolKey(before.nome) !== toolKey(target.nome)) rows.push({ label: "Nome", before: before.nome, after: target.nome });
  if (target.costo && norm(before.costo) !== norm(target.costo)) rows.push({ label: "Costo", before: before.costo, after: target.costo });
  if (target.peso && norm(before.peso) !== norm(target.peso)) rows.push({ label: "Peso", before: before.peso, after: target.peso });
  return rows;
}

export interface ToolListRow { href: string; nome: string; costo: string; peso: string; gruppo: string }

/** Light rows of the list, per edition, in the printed order (alphabetical in both PDFs). */
export function toolListRows(list: ToolEntry[] = toolEntries): Record<EquipmentEdition, ToolListRow[]> {
  // The tools as shown (corrected when list carries corrections), in the printed order.
  const shown = <E extends EquipmentEdition>(edition: E, id: string) => list.find(entry => entry.editions[edition]?.id === id)?.editions[edition] as ToolEntry["editions"][E];
  return {
    "2014": tools2014.map(printed => shown("2014", printed.id) ?? printed).map(tool => ({ href: toolHref(tool.id), nome: tool.nome, costo: tool.costo, peso: tool.peso, gruppo: tool.gruppo })),
    "2024": tools2024.map(printed => shown("2024", printed.id) ?? printed).map(tool => ({ href: toolHref(tool.id), nome: tool.nome, costo: tool.prezzo, peso: tool.peso, gruppo: tool.gruppo })),
  };
}
