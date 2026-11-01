import reference from "@/lib/data/gs-riferimento.json";
import { estimateChallenge, statsOf, type CrReference } from "@/lib/homebrew-cr";

/**
 * The quick CR check of a sheet with the SRD medians (PROMPT 46): loaded by the monster editor only when it opens, so
 * neither the check nor its table is in the JavaScript of «Proponi» that the Bestiario fetches ahead.
 */
export const checkSheet = (sheet: Parameters<typeof statsOf>[0]) => estimateChallenge(statsOf(sheet), reference as CrReference);
