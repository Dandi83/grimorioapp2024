import type { MonsterModel } from "./parse";
import type { HeroKind } from "./party";
import { simulate, TACTICS, type BalanceMetrics, type FightSetup, type Tactic } from "./simulate";

/**
 * The fights of the Bilanciamento (PROMPT 19). The base: 4 characters (fighter, cleric, rogue, wizard) of level = CR,
 * with each of the three tactics. The test situations, with the «ottimale» master: other groups and levels. They do
 * not change the verdict; they raise warnings when the monster does much worse than the SRD ones in the same situation.
 */
export type StressKey = "tre" | "cinque" | "sei" | "sotto" | "sopra" | "marziale" | "arcano";
export type StressScenario = { key: StressKey; label: string; setup: FightSetup };

const G: HeroKind = "guerriero", C: HeroKind = "chierico", L: HeroKind = "ladro", M: HeroKind = "mago";
export const STRESS: StressScenario[] = [
  { key: "tre", label: "Gruppo di 3 PG (senza mago)", setup: { kinds: [G, C, L] } },
  { key: "cinque", label: "Gruppo di 5 PG (un guerriero in più)", setup: { kinds: [G, C, L, M, G] } },
  { key: "sei", label: "Gruppo di 6 PG (guerriero e chierico in più)", setup: { kinds: [G, C, L, M, G, C] } },
  { key: "sotto", label: "PG di un livello in meno", setup: { levelShift: -1 } },
  { key: "sopra", label: "PG di un livello in più", setup: { levelShift: 1 } },
  { key: "marziale", label: "Gruppo marziale (guerriero, guerriero, ladro, chierico)", setup: { kinds: [G, G, L, C] } },
  { key: "arcano", label: "Gruppo arcano (mago, mago, chierico, ladro)", setup: { kinds: [M, M, C, L] } },
];

/** Fights of a sheet: 3000 for each tactic in the base, 300 for each test situation. */
export const BASE_FIGHTS = 3000;
export const STRESS_FIGHTS = 300;
/** Fights of each SRD monster for the reference file (scripts/build-monster-balance.mjs). */
export const REFERENCE_FIGHTS = 800;

export type Measures = { tactics: Record<Tactic, BalanceMetrics>; stress: Record<StressKey, BalanceMetrics> };

export function measure(model: MonsterModel, baseFights = BASE_FIGHTS, stressFights = STRESS_FIGHTS): Measures {
  const tactics = Object.fromEntries(TACTICS.map(tactic => [tactic, simulate(model, baseFights, undefined, { tactic })])) as Record<Tactic, BalanceMetrics>;
  const stress = Object.fromEntries(STRESS.map(scenario => [scenario.key, simulate(model, stressFights, undefined, scenario.setup)])) as Record<StressKey, BalanceMetrics>;
  return { tactics, stress };
}

/** How many fights a sheet takes: the note under the box. */
export const fightsOfASheet = (baseFights = BASE_FIGHTS, stressFights = STRESS_FIGHTS) => baseFights * TACTICS.length + stressFights * STRESS.length;
