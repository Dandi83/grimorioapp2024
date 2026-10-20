export type ManualCategory = "condizioni" | "equipaggiamento" | "classi" | "background" | "specie" | "creazione";
export interface ManualBlock { kind: "heading" | "prose" | "table"; text: string; page: number; size?: number; sourceHash: string; region?: number[]; }
export interface ManualEntry { id: string; title: string; category: ManualCategory; subgroup: string; page: number; pages: number[]; blocks: ManualBlock[]; edizione?: "2014"; }
export const MANUAL_CATEGORIES = { condizioni: "Condizioni", equipaggiamento: "Equipaggiamento", classi: "Classi", background: "Background", specie: "Specie", creazione: "Creazione e talenti" } as const;
export const MANUAL_SOURCE_URL = "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf";
/** 2014 conditions: SRD 5.1 italiano, Appendice A del Manuale del Giocatore. */
export const LEGACY_MANUAL_SOURCE_URL = "https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1_IT.pdf";
