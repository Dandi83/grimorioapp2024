import type { Ability, Dice } from "./parse";

/**
 * The reference group of the Bilanciamento: 4 characters (fighter, cleric, rogue, wizard) of level L = the CR rounded
 * (1 to 20), with simple, fixed choices. The numbers follow the 2014 and 2024 rules closely enough for a comparison.
 */
export type Hero = {
  kind: "guerriero" | "chierico" | "ladro" | "mago";
  ac: number;
  hp: number;
  saves: Record<Ability, number>;
};

export const levelOf = (cr: number) => Math.min(20, Math.max(1, Math.round(cr)));
export const proficiency = (level: number) => 2 + Math.floor((level - 1) / 4);
export const mainModifier = (level: number) => (level < 4 ? 3 : level < 8 ? 4 : 5);
/** The save DC of the characters' spells. */
export const heroDc = (level: number) => 8 + proficiency(level) + mainModifier(level);

const BASE: Record<Ability, number> = { for: 0, des: 1, cos: 2, int: 0, sag: 1, car: 0 };
function saves(level: number, proficient: Ability[]): Record<Ability, number> {
  const result = { ...BASE };
  for (const ability of proficient) result[ability] += mainModifier(level) + proficiency(level);
  return result;
}
const heavyAc = (level: number) => 18 + (level >= 5 ? 1 : 0) + (level >= 10 ? 1 : 0);

export function party(level: number): Hero[] {
  return [
    { kind: "guerriero", ac: heavyAc(level), hp: 12 + 8 * (level - 1), saves: saves(level, ["for", "cos"]) },
    { kind: "chierico", ac: heavyAc(level), hp: 10 + 7 * (level - 1), saves: saves(level, ["sag", "car"]) },
    { kind: "ladro", ac: 14 + (level >= 5 ? 1 : 0) + (level >= 10 ? 1 : 0), hp: 10 + 7 * (level - 1), saves: saves(level, ["des", "int"]) },
    { kind: "mago", ac: 15, hp: 8 + 6 * (level - 1), saves: saves(level, ["int", "sag"]) },
  ];
}

/** Fighter: attacks per turn, bonus, damage; Action Surge (attacks doubled in the first round) from level 2. */
export function fighter(level: number) {
  const bonus = level >= 10 ? 1 : 0;
  return {
    attacks: level >= 20 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1,
    toHit: proficiency(level) + mainModifier(level) + bonus,
    damage: [{ count: 2, sides: 6, flat: mainModifier(level) + bonus }] as Dice[],
    surge: level >= 2,
  };
}

/** Cleric: from level 5 every turn 3d8/4d8/5d8 (Wisdom save, half on a success) and one attack 1d8 + mod; raises a fallen ally. */
export function cleric(level: number) {
  return {
    aura: level >= 5 ? { count: level >= 13 ? 5 : level >= 9 ? 4 : 3, sides: 8, flat: 0 } : undefined,
    toHit: proficiency(level) + mainModifier(level),
    damage: [{ count: 1, sides: 8, flat: mainModifier(level) }] as Dice[],
    heal: { count: 2, sides: 4, flat: mainModifier(level) } as Dice,
    heals: 2 + Math.floor(level / 3),
  };
}

/** Rogue: one attack 1d8 + mod + ⌈L/2⌉d6, with advantage every other round. */
export function rogue(level: number) {
  return {
    toHit: proficiency(level) + mainModifier(level),
    damage: [{ count: 1, sides: 8, flat: mainModifier(level) }, { count: Math.ceil(level / 2), sides: 6, flat: 0 }] as Dice[],
  };
}

export type WizardSpell = { name: string; dice: Dice; ability?: Ability; half?: boolean; area?: boolean; slots: number; legendaryResistance?: boolean };

/** Wizard: the spells in order while slots last, then the cantrip; Shield (+5 AC against one hit). */
export function wizard(level: number) {
  const spells: WizardSpell[] = [
    { name: "disintegrazione", dice: { count: 10, sides: 6, flat: 40 }, ability: "des", half: false, slots: level >= 13 ? 2 : level >= 11 ? 1 : 0, legendaryResistance: true },
    { name: "cono di freddo", dice: { count: 8, sides: 8, flat: 0 }, ability: "cos", half: true, slots: level >= 13 ? 2 : level >= 9 ? 1 : 0, legendaryResistance: true },
    { name: "palla di fuoco", dice: { count: 8, sides: 6, flat: 0 }, ability: "des", half: true, slots: level >= 7 ? 3 : level >= 5 ? 2 : 0 },
    { name: "dardo incantato", dice: { count: 3, sides: 4, flat: 3 }, slots: level >= 3 ? 3 : 2 },
  ];
  return {
    spells,
    cantrip: { toHit: proficiency(level) + mainModifier(level), damage: [{ count: level >= 17 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1, sides: 10, flat: 0 }] as Dice[] },
    shields: level >= 7 ? 4 : level >= 3 ? 3 : 2,
  };
}
