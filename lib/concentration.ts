// The concentration rule of each edition, as printed in the Italian SRD (scripts/transcribe-concentration.py):
// 2024 from the Glossario delle regole of SRD 5.2.1, 2014 from «Lanciare incantesimi» of SRD 5.1.
// «Concentrazione» in the Durata box of every spell card links here (components/spell-sheet.tsx).
// Also the damage rules (scripts/transcribe-damage-rules.py), where «resistenza», «immunità» and «vulnerabilità»
// of the cards lead (lib/damage-rule-link.ts): 2024 from the Glossario delle regole, 2014 from «Combattimento» and «Mostri».
import data from "./data/srd-concentrazione-it.json";
import damageData from "./data/srd-regole-danni-it.json";

export interface RuleBlock { kind: "prose"; text: string; page: number; label?: string; sourceHash: string }
export interface RuleEntry {
  id: string; title: string; edizione: "2024" | "2014"; document: string; chapter: string;
  sourceUrl: string; sourceSha256: string; page: number; pages: number[]; blocks: RuleBlock[];
}

export const concentrationRules = data as RuleEntry[];
export const damageRules = damageData as RuleEntry[];
/** Every page of /regole. */
export const rulePages: readonly RuleEntry[] = [...concentrationRules, ...damageRules];

export function getRule(id: string): RuleEntry | undefined {
  return rulePages.find(rule => rule.id === id);
}
