import { hasUnverifiedDescription, isOriginalDescription } from "../lib/spells-types";

export function SpellProvenanceMarker({ id }: { id: string }) {
  if (!hasUnverifiedDescription(id)) return null;
  const original = isOriginalDescription(id);
  return (
    <sup
      className="ml-0.5 text-[0.65em] font-semibold text-primary"
      title={original ? "Sintesi originale delle regole 2024, non trascrizione ufficiale SRD" : "Descrizione non tratta dal SRD: fonte e autorizzazione al riutilizzo non verificate"}
      aria-label={original ? "Descrizione originale non tratta dal SRD" : "Descrizione non verificata nel SRD"}
    >*</sup>
  );
}
