"use client";

import { useState } from "react";

import { FilterGroup } from "@/components/catalog-ui";
import { PROVENANCE_LABEL, PROVENANCE_OPTIONS, matchesProvenance, type Provenance, type ProvenanceIds } from "@/lib/provenance";

/**
 * The «Provenienza» filter of a list: only while the provenance of the cards is known, that is for the
 * administrator (lists of the site: after /api/admin/sessione and /api/admin/no-srd; reserved area: its own
 * data). Without them (visitors, after «Esci») the filter is «Tutte» and nothing is drawn.
 * draft: the value in the filter sheet until «Mostra»; value: the one applied to the list.
 */
export function useProvenanceFilter(ids: ProvenanceIds | null) {
  const [value, setValue] = useState<Provenance>("tutte");
  const [draft, setDraft] = useState<Provenance>("tutte");
  // «Esci»: back to «Tutte» (the next login starts from there too).
  if (!ids && (value !== "tutte" || draft !== "tutte")) { setValue("tutte"); setDraft("tutte"); }
  const applied: Provenance = ids ? value : "tutte";
  return {
    ids, value: applied, setValue, draft: ids ? draft : "tutte" as Provenance, setDraft,
    /** The card passes the filter: value (the list) or the draft (the count of the sheet). */
    matches: (card: { id: string; homebrew?: boolean }, which: Provenance = applied) => !ids || matchesProvenance(card, which, ids),
  };
}

/** The group in the filter sheet (or above an admin list): one choice. */
export function ProvenanceGroup({ value, onChange }: { value: Provenance; onChange: (value: Provenance) => void }) {
  return (
    <div data-provenance-filter="">
      <FilterGroup title="Provenienza" options={PROVENANCE_OPTIONS} selected={[value]} label={option => PROVENANCE_LABEL[option]}
        onToggle={option => onChange(option)} />
    </div>
  );
}
