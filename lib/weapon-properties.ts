import { englishName } from "./english-names";
import { propertyPage, propertyText, weapons, type Weapon } from "./equipment";
import type { EquipmentEdition } from "./equipment-types";

/**
 * The weapon properties (PROMPT 48), a page each (/equipaggiamento/proprieta/<id>) like the masteries of PROMPT 47, but in
 * both editions with their own texts: the rule printed by the SRD of each edition (the same propertyText of the weapon
 * cards), the official English name (lib/data/nomi-inglesi-srd.json, «proprieta») and the weapons of that edition that have
 * it, in the order of the weapons list. «Speciale» is a rule of 2014 only; «Gittata» has its own rule in both.
 */
export const PROPERTY_NAMES: Record<string, string> = {
  accurata: "Accurata", "due-mani": "Due mani", gittata: "Gittata", lancio: "Lancio", leggera: "Leggera", munizioni: "Munizioni",
  pesante: "Pesante", portata: "Portata", ricarica: "Ricarica", speciale: "Speciale", versatile: "Versatile",
};

export interface PropertyEdition { en?: string; testo: string; page?: number }
export interface WeaponPropertyEntry { id: string; nome: string; editions: Partial<Record<EquipmentEdition, PropertyEdition>> }

export const weaponProperties: WeaponPropertyEntry[] = Object.entries(PROPERTY_NAMES).map(([id, nome]) => ({
  id, nome,
  editions: Object.fromEntries((["2024", "2014"] as const).flatMap(edition => {
    const testo = propertyText(edition, id);
    return testo ? [[edition, { en: englishName("proprieta", edition, id), testo, page: propertyPage(edition, id) }]] : [];
  })),
}));

export const getWeaponProperty = (id: string) => weaponProperties.find(entry => entry.id === id);
export const propertyHref = (id: string, edition?: EquipmentEdition) => `/equipaggiamento/proprieta/${id}${edition === "2014" ? "?edizione=2014" : ""}`;

/** The weapons of this edition with the property («Gittata»: the thrown and ammunition weapons with a range), in list order. */
export function weaponsWithProperty(id: string, edition: EquipmentEdition, list: Weapon[] = weapons): Weapon[] {
  return list.filter(weapon => {
    const view = weapon.editions[edition];
    return !!view && (id === "gittata" ? !!view.gittata : view.proprieta.some(property => property.key === id));
  });
}
