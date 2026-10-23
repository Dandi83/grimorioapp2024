import { EDITION_BAND, type AdminEdition } from "@/lib/admin-edition";

/** «Edizione 2014» chip at the top of a card being edited. */
export function EditionChip({ edition }: { edition: AdminEdition }) {
  return (
    <span data-testid="edition-chip" className="inline-flex shrink-0 items-center self-start rounded-[6px] px-2 py-0.5 text-[13px] font-bold"
      style={{ background: EDITION_BAND[edition].background, color: EDITION_BAND[edition].text }}>
      Edizione {edition}
    </span>
  );
}
