// «Provenienza» of a spell or a creature, for the filter the administrator sees in the lists: the same rule as the
// «NO SRD» pill (lib/card-display.ts), computed from the card, so present and future cards are all included. Pure.
import { isNoSrdSource, type CardSource } from "./card-display";

export type Provenance = "tutte" | "srd" | "nosrd" | "sintesi" | "aggiunte" | "modificate";
export const PROVENANCE_OPTIONS: readonly Provenance[] = ["tutte", "srd", "nosrd", "sintesi", "aggiunte", "modificate"];
export const PROVENANCE_LABEL: Record<Provenance, string> = {
  tutte: "Tutte", srd: "Solo SRD", nosrd: "Solo NO SRD", sintesi: "Sintesi originali", aggiunte: "Aggiunte da me", modificate: "SRD modificate",
};

/**
 * The NO SRD cards of a list split as the «Sintesi originale» switch does, and the SRD cards that no longer match
 * their record («SRD modificate», lib/srd-modified.ts) (/api/admin/no-srd).
 */
export interface ProvenanceIds { sintesi: ReadonlySet<string>; aggiunte: ReadonlySet<string>; modificate: ReadonlySet<string> }

/**
 * SRD: neither NO SRD, nor modified, nor homebrew; NO SRD: original summaries, cards added here and SRD cards
 * modified (they have lost the SRD box).
 */
export function matchesProvenance(card: { id: string; homebrew?: boolean }, value: Provenance, ids: ProvenanceIds): boolean {
  if (value === "tutte") return true;
  const sintesi = ids.sintesi.has(card.id), aggiunta = ids.aggiunte.has(card.id), modificata = ids.modificate.has(card.id);
  if (value === "srd") return !sintesi && !aggiunta && !modificata && !card.homebrew;
  if (value === "nosrd") return sintesi || aggiunta || modificata;
  if (value === "modificate") return modificata;
  return value === "sintesi" ? sintesi : aggiunta;
}

/**
 * The sets from the labels of the cards (the reserved area has them; the public lists ask the endpoint); the
 * modified SRD cards come from lib/srd-modified.ts.
 */
export function provenanceIds(cards: readonly { id: string; fonte_scheda?: CardSource }[], modificate: Iterable<string> = []): ProvenanceIds {
  return {
    modificate: new Set(modificate),
    sintesi: new Set(cards.filter(card => card.fonte_scheda === "Sintesi originale").map(card => card.id)),
    aggiunte: new Set(cards.filter(card => isNoSrdSource(card.fonte_scheda) && card.fonte_scheda !== "Sintesi originale").map(card => card.id)),
  };
}
