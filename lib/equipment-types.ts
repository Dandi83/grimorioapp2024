// Pure types and helpers of the Equipaggiamento section: safe in client components.
// Lists carry only names, numbers and short labels; rule texts stay on the server.

export type EquipmentEdition = "2014" | "2024";

export const WEAPON_GROUP_TITLES = ["Mischia semplici", "Distanza semplici", "Mischia da guerra", "Distanza da guerra"] as const;
/** "Arma da mischia semplice"… for the weapon sheet. */
export const WEAPON_GROUP_NAMES = ["Arma da mischia semplice", "Arma a distanza semplice", "Arma da mischia da guerra", "Arma a distanza da guerra"] as const;
export type WeaponGroup = 0 | 1 | 2 | 3;
export const isMartial = (group: WeaponGroup) => group >= 2;
export const isRanged = (group: WeaponGroup) => group === 1 || group === 3;

export interface WeaponListEdition {
  nome: string;
  /** "1d8", "2d6", "1"; empty for the net. */
  danni: string;
  tipoDanno: string;
  costo: string;
  peso: string;
  /** Short labels: "Lancio 6/18", "Versatile (1d8)". */
  proprieta: string[];
  padronanza?: string;
  /** The official English name (lib/english-names.ts, PROMPT 35), added by the page on the server: searched, shown «in inglese». */
  en?: string;
}

export interface WeaponListItem {
  id: string;
  gruppo: WeaponGroup;
  editions: Partial<Record<EquipmentEdition, WeaponListEdition>>;
  /** True when the weapon differs between the editions or exists in only one. */
  changed: boolean;
  /** Generated from the data: "Dado: 1d12 → 1d10 · …". */
  changeNote?: string;
}

export const ARMOR_CATEGORY_TITLES = ["Armature leggere", "Armature medie", "Armature pesanti", "Scudo"] as const;
/** "Armatura leggera"… for the armor sheet. */
export const ARMOR_CATEGORY_NAMES = ["Armatura leggera", "Armatura media", "Armatura pesante", "Scudo"] as const;
export type ArmorCategory = 0 | 1 | 2 | 3;

/** Only what the badge does not already say: minimum Strength and Stealth disadvantage. */
export type ArmorChipKind = "strength" | "stealth";
export interface ArmorChip { kind: ArmorChipKind; label: string }

export interface ArmorListEdition {
  nome: string;
  /** Badge: "11", "14", "+2". */
  ca: string;
  /** Under the number, only what is needed to read it: ["+ Des"], ["+ Des", "max 2"], none for fixed AC and the shield. */
  caNote: string[];
  chips: ArmorChip[];
  costo: string;
  peso: string;
  /** The official English name (lib/english-names.ts, PROMPT 35), added by the page on the server. */
  en?: string;
}

export interface ArmorListItem {
  id: string;
  categoria: ArmorCategory;
  editions: Record<EquipmentEdition, ArmorListEdition>;
}

/** Donning and doffing time of each category, per edition: "Indossare 1 minuto · togliere 1 minuto". */
export type ArmorTimes = Record<EquipmentEdition, string[]>;
