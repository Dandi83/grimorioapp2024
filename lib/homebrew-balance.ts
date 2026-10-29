import "server-only";
import { draftToMonster, type HomebrewDraft } from "./homebrew-types";
import { balanceEdition, evaluateMonster } from "./monster-balance";
import type { Level } from "./monster-balance/compare";

/**
 * The verdict of the Bilanciamento for a homebrew sheet (PROMPT 19): saved with the card at the approval and at every
 * save, so the public pill «Bilanciamento verificato» depends on it. null: nothing to simulate.
 */
export function homebrewVerdict(draft: HomebrewDraft): Level | null {
  const monster = { ...draftToMonster(draft, "verifica"), homebrew_edizione: draft.edizione };
  const result = evaluateMonster(monster, balanceEdition(monster, false));
  return result.measures ? result.comparison.level : null;
}
