import type { ContentOverride } from "@/lib/content-overrides-apply";

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
            {labels[row.campo] ?? row.campo}: nel manuale «{row.valore_originale || "—"}»
          </li>
        ))}
      </ul>
    </aside>
  );
}
