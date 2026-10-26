"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import { restoreSrdAction } from "@/app/actions/admin-srd";

/**
 * «Ripristina testo SRD»: first a confirmation with the preview of the differences (children), then the
 * restore, only when the administrator confirms. The only write of the page.
 */
export function RestoreSrdButton({ kind, id, name, children }: { kind: string; id: string; name: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const confirm = () => start(async () => {
    setError("");
    let result: Awaited<ReturnType<typeof restoreSrdAction>>;
    try {
      result = await restoreSrdAction(kind, id);
    } catch {
      result = { ok: false, error: "Sessione scaduta: accedi di nuovo." };
    }
    if (!result.ok) { setError(result.error); return; }
    dialog.current?.close();
    router.refresh();
  });
  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-primary bg-card px-4 text-[15px] font-bold text-primary">
        <RotateCcw size={18} aria-hidden="true" /> Ripristina testo SRD
      </button>
      <dialog ref={dialog} aria-labelledby={`ripristina-${kind}-${id}`}
        className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-32px)] max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background p-5 text-foreground shadow-2xl backdrop:bg-[#2B2118]/50">
        <h2 id={`ripristina-${kind}-${id}`} className="font-serif text-[22px] font-bold leading-tight">Ripristinare il testo SRD di {name}?</h2>
        <p className="mt-1 text-[15px] leading-snug text-muted">Solo i campi qui sotto tornano al testo SRD esatto; il resto della scheda non cambia. La modifica finisce nel Registro modifiche.</p>
        {children}
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={confirm} className="min-h-11 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60">
            {pending ? "Ripristino…" : "Conferma ripristino"}
          </button>
          <button type="button" disabled={pending} onClick={() => dialog.current?.close()} className="min-h-11 rounded-full border border-border bg-card px-5 text-sm font-bold">Annulla</button>
        </div>
      </dialog>
    </>
  );
}
