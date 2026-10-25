// The concentration rule of each edition, as printed in the Italian SRD (scripts/transcribe-concentration.py):
// 2024 from the Glossario delle regole of SRD 5.2.1, 2014 from «Lanciare incantesimi» of SRD 5.1.
// «Concentrazione» in the Durata box of every spell card links here (components/spell-sheet.tsx).
import data from "./data/srd-concentrazione-it.json";

export interface RuleBlock { kind: "prose"; text: string; page: number; label?: string; sourceHash: string }
export interface RuleEntry {
  id: string; title: string; edizione: "2024" | "2014"; document: string; chapter: string;
  sourceUrl: string; sourceSha256: string; page: number; pages: number[]; blocks: RuleBlock[];
}

export const concentrationRules = data as RuleEntry[];

export function getRule(id: string): RuleEntry | undefined {
  return concentrationRules.find(rule => rule.id === id);
}
