// «Provenienza» of a spell or a creature, for the filter the administrator sees in the lists: the same rule as the
// «NO SRD» pill (lib/card-display.ts), computed from the card, so present and future cards are all included. Pure.
import { isNoSrdSource, type CardSource } from "./card-display";

export type Provenance = "tutte" | "srd" | "nosrd" | "sintesi" | "aggiunte";
export const PROVENANCE_OPTIONS: readonly Provenance[] = ["tutte", "srd", "nosrd", "sintesi", "aggiunte"];
export const PROVENANCE_LABEL: Record<Provenance, string> = {
  tutte: "Tutte", srd: "Solo SRD", nosrd: "Solo NO SRD", sintesi: "Sintesi originali", aggiunte: "Aggiunte da me",
};

/** The NO SRD cards of a list split as the «Sintesi originale» switch does (/api/admin/no-srd). */
export interface ProvenanceIds { sintesi: ReadonlySet<string>; aggiunte: ReadonlySet<string> }

/**
 * SRD: neither NO SRD nor homebrew (an SRD card edited in the reserved area stays SRD, as for the pill);
 * NO SRD: original summaries and cards added here.
 */
export function matchesProvenance(card: { id: string; homebrew?: boolean }, value: Provenance, ids: ProvenanceIds): boolean {
  if (value === "tutte") return true;
  const sintesi = ids.sintesi.has(card.id), aggiunta = ids.aggiunte.has(card.id);
  if (value === "srd") return !sintesi && !aggiunta && !card.homebrew;
  if (value === "nosrd") return sintesi || aggiunta;
  return value === "sintesi" ? sintesi : aggiunta;
}

/** The two sets from the labels of the cards (the reserved area has them; the public lists ask the endpoint). */
export function provenanceIds(cards: readonly { id: string; fonte_scheda?: CardSource }[]): ProvenanceIds {
  return {
    sintesi: new Set(cards.filter(card => card.fonte_scheda === "Sintesi originale").map(card => card.id)),
    aggiunte: new Set(cards.filter(card => isNoSrdSource(card.fonte_scheda) && card.fonte_scheda !== "Sintesi originale").map(card => card.id)),
  };
}
