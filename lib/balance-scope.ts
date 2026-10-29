import type { CardSource } from "./card-display";

/**
 * The sheets the box is for (PROMPT 12): our own — the homebrew creatures and the sheets made in the reserved area
 * («Aggiunta da te»). Never the official sheets: SRD 5.1, SRD 5.2.1 and its animals (also when edited here: they keep
 * no label) and the NO SRD sheets taken from a manual («Sintesi originale»). The SRD monsters stay only the reference group.
 */
export function balanceApplies(monster: { fonte_scheda?: CardSource; homebrew_edizione?: string; provenienza?: unknown }): boolean {
  if (monster.homebrew_edizione || monster.fonte_scheda === "Homebrew") return true;
  return !monster.provenienza && monster.fonte_scheda === "Aggiunta da te";
}

export const NOT_FOR_OFFICIAL = "Non previsto per le schede ufficiali";
