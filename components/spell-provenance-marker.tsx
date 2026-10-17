import { hasUnverifiedDescription } from "../lib/spells-types";

export function SpellProvenanceMarker({ id }: { id: string }) {
  if (!hasUnverifiedDescription(id)) return null;
  return (
    <sup
      className="ml-0.5 text-[0.65em] font-semibold text-primary"
      title="Descrizione non tratta dal SRD: fonte e autorizzazione al riutilizzo non verificate"
      aria-label="Descrizione non verificata nel SRD"
    >*</sup>
  );
}
