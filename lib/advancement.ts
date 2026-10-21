// Level advancement: experience points, proficiency bonus, fixed hit points and the XP split.
// Pure data and functions, safe in client components. The values match the SRD 5.1 and 5.2.1
// tables "Avanzamento dei personaggi" and "Punti ferita fissi per classe" (checked by the tests).

export interface AdvancementLevel { livello: number; pe: number; bonus: number }

export const LEVELS: AdvancementLevel[] = [
  [0, 2], [300, 2], [900, 2], [2700, 2], [6500, 3], [14000, 3], [23000, 3], [34000, 3], [48000, 4], [64000, 4],
  [85000, 4], [100000, 4], [120000, 5], [140000, 5], [165000, 5], [195000, 5], [225000, 6], [265000, 6], [305000, 6], [355000, 6],
].map(([pe, bonus], i) => ({ livello: i + 1, pe, bonus }));

/** Rule 2024: one bonus feat for every 30,000 XP beyond 355,000. */
export const BONUS_FEAT_XP = 30000;

export interface ClassHitPoints { classi: string[]; dado: string; fisso: number }

export const CLASS_HIT_POINTS: ClassHitPoints[] = [
  { classi: ["Barbaro"], dado: "d12", fisso: 7 },
  { classi: ["Guerriero", "Paladino", "Ranger"], dado: "d10", fisso: 6 },
  { classi: ["Bardo", "Chierico", "Druido", "Monaco", "Ladro", "Warlock"], dado: "d8", fisso: 5 },
  { classi: ["Stregone", "Mago"], dado: "d6", fisso: 4 },
];

/** "2.700", "355.000": dot for thousands also with four digits, as in the printed tables. */
export function formatNumber(value: number): string {
  return String(Math.trunc(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** True for the levels where the proficiency bonus goes up (5, 9, 13, 17). */
export function bonusRises(level: AdvancementLevel): boolean {
  return level.livello > 1 && LEVELS[level.livello - 2].bonus < level.bonus;
}

export interface LevelForXp {
  livello: number;
  bonus: number;
  /** XP of the next level; undefined at level 20. */
  prossimo?: number;
  mancanti?: number;
  /** Bonus feats beyond level 20 (rule 2024). */
  talentiBonus: number;
}

export function levelForXp(xp: number): LevelForXp {
  const value = Math.max(0, Math.floor(xp));
  const current = [...LEVELS].reverse().find(level => value >= level.pe)!;
  const next = LEVELS[current.livello];
  const talentiBonus = value > LEVELS[19].pe ? Math.floor((value - LEVELS[19].pe) / BONUS_FEAT_XP) : 0;
  return {
    livello: current.livello, bonus: current.bonus, talentiBonus,
    ...(next ? { prossimo: next.pe, mancanti: next.pe - value } : {}),
  };
}

/** XP shared among the characters: rounded down, the rest is returned apart. */
export function splitXp(total: number, characters: number): { aTesta: number; resto: number } {
  const n = Math.max(1, Math.floor(characters));
  return { aTesta: Math.floor(total / n), resto: total % n };
}

/** One choice of the XP calculator: a challenge rating with the XP read from the monster sheets. */
export interface ChallengeOption { key: string; label: string; pe: number; gs: number }
