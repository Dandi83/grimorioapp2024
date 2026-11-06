import { srdMonsterRecordEdition } from "./srd-monsters";

/** The part of the Bestiario that holds the button (lib/public-sections.ts): «Nascosta» until Daniele turns it on. */
export const TPK_SUMMON_PART = "tpk";

/** What the rule reads of a creature (lib/monsters-types.ts Monster). */
export interface TpkSummonCreature {
  id: string;
  edizione?: string;
  homebrew_edizione?: string;
  homebrew_autore?: string | null;
  homebrew_licenza?: string | null;
}

/**
 * PROMPT 69: the creatures that get «⚔ Affrontalo in Total Party Kill» at the bottom of their sheet, only 2024 ones:
 * - the SRD 5.2.1 monsters and animals (the SRD 5.1 sheets, «-2014», never);
 * - the original creatures of the editorial staff and of the community for 2024 or «Entrambe», the ones TPK can
 *   receive (lib/tpk-creatures.ts tpkVisible): a creature of the community only with its licence accepted.
 * Never the NO SRD sheets taken from a manual or the ones added in the reserved area: TPK does not have them.
 */
export function tpkSummonApplies(monster: TpkSummonCreature): boolean {
  if (monster.homebrew_edizione !== undefined) {
    if (monster.homebrew_edizione !== "2024" && monster.homebrew_edizione !== "entrambe") return false;
    return !monster.homebrew_autore || !!monster.homebrew_licenza;
  }
  if (monster.edizione === "2014" || monster.id.endsWith("-2014")) return false;
  return srdMonsterRecordEdition(monster.id) === "2024";
}
