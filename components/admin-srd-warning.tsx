import { TriangleAlert } from "lucide-react";

/** The answer of the editor actions when a save would take the SRD box away (app/actions/admin.ts, admin-monsters.ts). */
export const isSrdWarning = (result: unknown): boolean => !!result && typeof result === "object" && "srdWarning" in result && result.srdWarning === true;

/**
 * Before saving a card that has the SRD box now and would lose it with the change: «Salva comunque» sends the
 * form again with «perdi-srd», «Annulla» goes back to the form with every field as it was. Administrator only.
 */
export function SrdLossWarning({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div role="alertdialog" aria-labelledby="srd-loss-text" data-srd-warning="" className="mb-3 rounded-[12px] border-2 border-amber bg-[#FBF1D9] p-3">
      <p id="srd-loss-text" className="flex gap-2 text-[15px] font-semibold leading-snug text-foreground">
        <TriangleAlert size={20} className="mt-0.5 shrink-0 text-[#9A6A00]" aria-hidden="true" />
        Con questa modifica la scheda non coinciderà più con l’SRD e perderà il riquadro di provenienza.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onConfirm} className="min-h-11 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground">Salva comunque</button>
        <button type="button" onClick={onCancel} className="min-h-11 rounded-full border border-border bg-card px-5 text-sm font-bold text-foreground">Annulla</button>
      </div>
    </div>
  );
}
