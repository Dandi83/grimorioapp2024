import data from "./data/srd-tools-5.1-it.json";
import repairs from "./data/tools-repairs-20261021.json";
import { toolSlug } from "./tools";

/**
 * Tools of the SRD 5.1 (2014), from srd-tools-5.1-it.json (scripts/transcribe-srd-equipment.py
 * tools2014): one tool per table row. The texts of the groups (Strumenti da artigiano, Giochi,
 * Strumenti musicali) are shown once, at the head of their group.
 */

export type ToolGroup2014 = "artigiano" | "giochi" | "musicali" | "altri";
export interface Tool2014 {
  id: string;
  nome: string;
  costo: string;
  peso: string;
  gruppo: ToolGroup2014;
  paragraphs: string[];
  page: number;
}

const GROUPS: Record<string, ToolGroup2014> = { "Strumenti da artigiano": "artigiano", Giochi: "giochi", "Strumenti musicali": "musicali" };
const fix = (text: string) => (repairs.testi2014 as { da: string; a: string }[]).reduce((value, item) => value.split(item.da).join(item.a), text);
const descriptions = data.descrizioni as Record<string, { testo: string; page: number }>;

export const tools2014Source = data.fonte;
export const tools2014Intro = data.intro.testo;
/** Texts printed for a whole group: "Strumenti da artigiano", "Giochi", "Strumenti musicali". */
export const tools2014GroupText: Partial<Record<ToolGroup2014, string>> = {
  artigiano: descriptions["Strumenti da artigiano"] && fix(descriptions["Strumenti da artigiano"].testo),
  giochi: descriptions["Giochi"] && fix(descriptions["Giochi"].testo),
  musicali: descriptions["Strumenti musicali"] && fix(descriptions["Strumenti musicali"].testo),
};

export const tools2014: Tool2014[] = data.tabella.map(row => {
  const text = descriptions[row.nome];
  return {
    id: toolSlug(row.nome), nome: row.nome, costo: row.costo, peso: row.peso,
    gruppo: row.gruppo ? GROUPS[row.gruppo] : "altri",
    paragraphs: text ? fix(text.testo).split("\n\n") : [], page: text?.page ?? row.page,
  };
});
