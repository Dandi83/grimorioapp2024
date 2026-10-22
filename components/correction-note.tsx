import type { ContentOverride } from "@/lib/content-overrides-apply";
import { fieldLabels, type ContentEdition } from "@/lib/content-sections";

const short = (text: string) => (text.length > 280 ? `${text.slice(0, 280).trimEnd()}…` : text);

/**
 * At the bottom of a corrected card: what differs from the printed manual, with the printed
 * value, so the site stays transparent about its fidelity to the source. Plain text only.
 */
export function CorrectionNote({ corrections, labels }: { corrections: ContentOverride[]; labels: Record<string, string> }) {
  return (
    <aside aria-label="Correzioni" className="rounded-xl border border-dashed border-border px-4 py-3 text-[13px] leading-5 text-muted">
      <p className="font-semibold">Corretto rispetto al manuale originale</p>
      <ul className="mt-1 space-y-0.5">
        {corrections.map(row => (
          <li key={row.id} className="break-words">
            {labels[row.campo] ?? row.campo}: nel manuale «{short(row.valore_originale) || "—"}»
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** The note for one card of a registered section (labels from lib/content-sections.ts). */
export function SectionCorrectionNote({ section, id, edition, corrections }: { section: string; id: string; edition: ContentEdition; corrections?: ContentOverride[] }) {
  if (!corrections?.length) return null;
  return <CorrectionNote corrections={corrections} labels={fieldLabels(section, id, edition)} />;
}
