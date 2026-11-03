import manualData from "./data/srd-manual-5.2.1-it.json";
import feats2014Data from "./data/srd-feats-5.1-it.json";
import { englishName } from "./english-names";
import type { EquipmentEdition } from "./equipment-types";

/**
 * The feats of the SRD (PROMPT 49): the 17 of the SRD 5.2.1 Italian manual (chapter «Talenti», p. 98–100), read block by
 * block from lib/data/srd-manual-5.2.1-it.json, and «Lottatore» of the SRD 5.1 (lib/data/srd-feats-5.1-it.json, p. 84).
 * Texts as printed: only the names and the official English names (lib/data/nomi-inglesi-srd.json, «talenti») are ours
 * to show, never a text of ours. A block starting with a small letter continues the paragraph before (a column break of
 * the PDF), shown joined with a space; every block stays as printed.
 */
export type FeatCategory = "Origini" | "Generale" | "Stile di combattimento" | "Dono epico";
export const FEAT_CATEGORIES: readonly FeatCategory[] = ["Origini", "Generale", "Stile di combattimento", "Dono epico"];
/** The filter pills and the group titles of the list. */
export const CATEGORY_TITLES: Record<FeatCategory, string> = { Origini: "Origini", Generale: "Generali", "Stile di combattimento": "Stile di combattimento", "Dono epico": "Doni epici" };

export interface FeatParagraph { lead?: string; text: string }
export interface FeatEdition {
  nome: string; en?: string; categoria?: FeatCategory; prerequisito?: string;
  /** The line under the name as printed («Talento Origini», «Talento Generale (prerequisito: …)»); none in 2014. */
  riga?: string;
  paragrafi: FeatParagraph[]; elenco?: string[]; page: number;
  /** The printed blocks, unchanged (the tests compare them with the source). */
  blocks: string[];
}
export interface Feat { id: string; editions: Partial<Record<EquipmentEdition, FeatEdition>> }

export const featId = (nome: string) => nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** «Competenza in iniziativa. Quando tiri…»: the name of a benefit, in bordeaux; a sentence alone is never a name. */
export function splitLead(text: string): FeatParagraph {
  const match = /^([A-ZÀ-Ý][^.:]{1,45})\.\s+(\S[\s\S]*)$/.exec(text);
  return match && match[1].split(" ").length <= 6 ? { lead: match[1], text: match[2] } : { text };
}

type Block = { kind: string; text: string; page: number; size?: number };
const entry = (manualData.entries as unknown as { id: string; blocks: Block[] }[]).find(item => item.id === "personaggi-talenti")!;

function feats2024(): Feat[] {
  const out: Feat[] = [];
  let current: { nome: string; page: number; blocks: string[] } | undefined;
  const flush = () => {
    if (!current) return;
    const [riga, ...rest] = current.blocks;
    const line = /^Talento (Origini|Generale|Stile di combattimento|Dono epico)(?: \(prerequisito: (.+)\))?$/.exec(riga ?? "");
    if (!line) throw new Error(`Talento senza categoria: ${current.nome}`);
    const paragrafi: FeatParagraph[] = [];
    for (const text of rest) {
      if (/^[a-zà-ù]/.test(text) && paragrafi.length) paragrafi[paragrafi.length - 1].text += ` ${text}`;
      else paragrafi.push(splitLead(text));
    }
    const id = featId(current.nome);
    out.push({ id, editions: { "2024": {
      nome: current.nome, en: englishName("talenti", "2024", id), categoria: line[1] as FeatCategory, ...(line[2] ? { prerequisito: line[2] } : {}),
      riga, paragrafi, page: current.page, blocks: current.blocks,
    } } });
  };
  for (const block of entry.blocks) {
    // A feat: a heading of size 12 (the categories are 14, the chapter 18 and 26).
    if (block.kind === "heading") { flush(); current = block.size === 12 ? { nome: block.text, page: block.page, blocks: [] } : undefined; continue; }
    if (current && block.kind === "prose") current.blocks.push(block.text);
  }
  flush();
  return out;
}

function feats2014(): FeatEdition[] {
  return feats2014Data.talenti.map(feat => ({
    nome: feat.nome, en: englishName("talenti", "2014", feat.id), prerequisito: feat.prerequisito,
    paragrafi: feat.paragrafi.map(text => ({ text })), elenco: feat.elenco, page: feat.page, blocks: [...feat.paragrafi, ...feat.elenco],
  }));
}

export const feats: Feat[] = (() => {
  const list = feats2024();
  for (const feat of feats2014()) {
    const id = featId(feat.nome), same = list.find(item => item.id === id);
    if (same) same.editions["2014"] = feat; else list.push({ id, editions: { "2014": feat } });
  }
  return list;
})();

export const getFeat = (id: string) => feats.find(feat => feat.id === id);
export const featSources = { "2024": { document: "SRD 5.2.1", sourceUrl: "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf" }, "2014": { document: feats2014Data.fonte.document, sourceUrl: feats2014Data.fonte.sourceUrl } } as const;

/**
 * «ℹ️ Perché non ci sono tutti i talenti?» on /talenti (PROMPT 54, texts approved by Daniele): the number of feats of each
 * edition comes from the data, so it stays right if they change.
 */
export function featsNoteText(edition: "2014" | "2024"): string {
  const count = feats.filter(feat => feat.editions[edition]).length;
  if (edition === "2024") return `Il Grimorio pubblica solo le regole dell'SRD 5.2.1, la parte che Wizards of the Coast rilascia con licenza CC BY 4.0. Contiene ${count} talenti: gli altri si trovano nel Manuale del Giocatore 2024.`;
  const only = feats.find(feat => feat.editions["2014"])?.editions["2014"]?.nome;
  return `Il Grimorio pubblica solo le regole dell'SRD 5.1, la parte che Wizards of the Coast rilascia con licenza CC BY 4.0. ${count === 1 && only ? `Contiene un solo talento, ${only}` : `Contiene ${count} talenti`}: gli altri si trovano nel Manuale del Giocatore 2014.`;
}
