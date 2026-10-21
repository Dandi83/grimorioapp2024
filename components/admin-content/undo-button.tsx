"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { undoContentAction, undoEditorAction } from "@/app/actions/admin-content";

/** «Annulla modifica»: asks for confirmation; the card shows the printed value again. */
export function UndoButton({ id, editor = false }: { id: string; editor?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <span className="flex flex-col items-end">
      <button type="button" disabled={pending} className="min-h-8 font-bold text-primary disabled:opacity-50" onClick={() => {
        if (!window.confirm(editor ? "Annullare questa modifica? La scheda torna al valore precedente." : "Annullare questa modifica? La scheda mostrerà di nuovo il valore del manuale.")) return;
        const form = new FormData();
        form.set("id", id);
        startTransition(async () => {
          try {
            const result = await (editor ? undoEditorAction : undoContentAction)(form);
            if (result.ok) router.refresh();
            else setError(result.error);
          } catch {
            setError("Non riuscito. Riprova.");
          }
        });
      }}>{pending ? "Annullo…" : "Annulla modifica"}</button>
      {error && <span role="alert" className="font-semibold text-primary">{error}</span>}
    </span>
  );
}
