import type { Monster } from "./monsters-types";

export const MONSTER_EXTRA_FIELDS = ["iniziativa", "bonus_competenza", "attrezzatura", "azioni_bonus", "immunita", "sottotitolo_fonte"] as const;
export type MonsterExtraFields = Pick<Monster, typeof MONSTER_EXTRA_FIELDS[number]>;

/** Missing fields belong to older open forms; an explicit empty value clears a field. */
export function monsterExtraFieldsFromForm(form: FormData): MonsterExtraFields {
  return Object.fromEntries(MONSTER_EXTRA_FIELDS.filter(key => form.has(key)).map(key => {
    const value = form.get(key);
    return [key, typeof value === "string" ? value.trim() : ""];
  }));
}
