import { hasUnverifiedDescription } from "../lib/spells-types";

export function SpellProvenanceMarker({ id }: { id: string }) {
  if (!hasUnverifiedDescription(id)) return null;
  return (
    <sup
      className="ml-0.5 text-[0.65em] font-semibold text-primary"
      title="Sintesi originale delle regole 2024, non trascrizione ufficiale SRD"
      aria-label="Descrizione originale non tratta dal SRD"
    >*</sup>
  );
}
