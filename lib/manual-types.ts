export type ManualCategory = "condizioni" | "equipaggiamento" | "personaggi";
export interface ManualBlock { kind: "heading" | "prose" | "table"; text: string; page: number; size?: number; sourceHash: string; region?: number[]; }
export interface ManualEntry { id: string; title: string; category: ManualCategory; subgroup: string; page: number; pages: number[]; blocks: ManualBlock[]; }
export const MANUAL_CATEGORIES = { condizioni: "Condizioni", equipaggiamento: "Equipaggiamento", personaggi: "Personaggi" } as const;
export const MANUAL_SOURCE_URL = "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf";
