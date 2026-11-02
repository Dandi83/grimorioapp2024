import { englishName } from "./english-names";
import { MASTERY_NAMES, masteryPage, masteryText, weapons, type Weapon } from "./equipment";

/**
 * The eight weapon masteries of the 2024 rules (PROMPT 47): a page each (/equipaggiamento/padronanze/<id>), the official
 * English name (lib/data/nomi-inglesi-srd.json, «padronanze»), the SRD text (the same masteryText of the weapon cards)
 * and the 2024 weapons that have it, in the order of the weapons list. Only the names and texts of the SRD.
 */
export interface Mastery { id: string; nome: string; en?: string; testo: string; page?: number }

export const masteryId = (nome: string) => nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const masteryHref = (nome: string) => `/equipaggiamento/padronanze/${masteryId(nome)}`;

export const masteries: Mastery[] = MASTERY_NAMES.map(nome => ({
  id: masteryId(nome), nome, en: englishName("padronanze", "2024", masteryId(nome)), testo: masteryText(nome) ?? "", page: masteryPage(nome),
}));

export const getMastery = (id: string) => masteries.find(mastery => mastery.id === id);

/** The 2024 weapons with this mastery (the list given, corrected or not), in its order. */
export function weaponsWithMastery(nome: string, list: Weapon[] = weapons): Weapon[] {
  return list.filter(weapon => weapon.editions["2024"]?.padronanza === nome);
}
