// Pure types and helpers of the Equipaggiamento section: safe in client components.
// Lists carry only names, numbers and short labels; rule texts stay on the server.

export type EquipmentEdition = "2014" | "2024";
export const EQUIPMENT_EDITIONS: readonly EquipmentEdition[] = ["2024", "2014"];
/** The last edition chosen in the Equipaggiamento section on this phone or browser. */
export const EQUIPMENT_EDITION_KEY = "grimorio.equipaggiamento.edizione";

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
