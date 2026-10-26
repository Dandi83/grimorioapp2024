import type { CardSource } from "@/lib/card-display";

/** The switch is offered for the cards added here (new ones included); the 49 summaries of the project are fixed. */
export function summaryFieldState(card: { fonte_scheda?: CardSource; sintesi_progetto?: true } | null): "switch" | "fixed" | "none" {
  if (!card) return "switch";
  if (card.sintesi_progetto) return "fixed";
  return card.fonte_scheda === "Aggiunta da te" || card.fonte_scheda === "Sintesi originale" ? "switch" : "none";
}

/** The label of the preview: what the switch says now, else the label the card already has. */
export function previewSource(values: Record<string, string>, current: CardSource | undefined): CardSource | undefined {
  return "sintesi-campo" in values ? (values.sintesi === "on" ? "Sintesi originale" : "Aggiunta da te") : current;
}

/**
 * «Sintesi originale» in the editor of a NO SRD card (spells and creatures, both editions): on, the card is a
 * summary written in our own words; off (the default), a card added by the Grimorio. Saved with the card
 * (lib/content-editions.ts); it changes the box at the bottom of the card and the administrator's label.
 */
export function AdminSummaryField({ state, initial }: { state: "switch" | "fixed" | "none"; initial: boolean }) {
  if (state === "none") return null;
  if (state === "fixed") {
    return <p data-testid="summary-fixed" className="rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm text-foreground">
      <span className="font-semibold">Sintesi originale</span> del progetto: resta sempre una sintesi.
    </p>;
  }
  return <div className="rounded-lg border border-border px-3 py-2.5">
    <input type="hidden" name="sintesi-campo" value="1" />
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-foreground">
      <span>Sintesi originale</span>
      <input type="checkbox" role="switch" name="sintesi" defaultChecked={initial} className="peer sr-only" />
      <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full bg-border transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-card after:shadow after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary" />
    </label>
    <p className="mt-1 text-xs leading-5 text-muted-foreground">Acceso: la scheda è una sintesi scritta con parole nostre. Spento: scheda inserita dal Grimorio. Cambia il riquadro in fondo alla scheda; resta NO SRD.</p>
  </div>;
}
