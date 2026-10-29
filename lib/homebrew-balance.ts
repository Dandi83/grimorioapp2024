import "server-only";
import { draftToMonster, type HomebrewDraft } from "./homebrew-types";
import { balanceEditions, evaluateMonster, overallLevel } from "./monster-balance";
import type { Level } from "./monster-balance/compare";

/**
 * The verdict of the Bilanciamento for a homebrew sheet (PROMPT 19): saved with the card at the approval and at every
 * save, so the public pill «Bilanciamento verificato» depends on it. null: nothing to simulate.
 */
export function homebrewVerdict(draft: HomebrewDraft): Level | null {
  const monster = { ...draftToMonster(draft, "verifica"), homebrew_edizione: draft.edizione };
  // «2014 e 2024»: in line only when it is against both SRD (PROMPT 22).
  return overallLevel(balanceEditions(monster, false).map(edition => evaluateMonster(monster, edition)));
}
