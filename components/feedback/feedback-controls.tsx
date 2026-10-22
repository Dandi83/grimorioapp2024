"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteFeedbackAction, feedbackNoteAction, feedbackStateAction } from "@/app/actions/admin-feedback";
import { NOTE_MAX, type FeedbackState } from "@/lib/feedback-input";

const BUTTONS: { value: FeedbackState; label: string; tone: string }[] = [
  { value: "letta", label: "Letta", tone: "border-chip-border text-primary" },
  { value: "risolta", label: "Risolta", tone: "border-[#3F5A2A] text-[#3F5A2A]" },
  { value: "archiviata", label: "Archivia", tone: "border-chip-border text-primary" },
];

/** State, private note and deletion of one report (admin only: every action checks the login). */
export function FeedbackControls({ id, stato, nota }: { id: string; stato: FeedbackState; nota: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState(stato);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [noteState, saveNote, savingNote] = useActionState(feedbackNoteAction, null);

  const change = (value: FeedbackState) => {
    setError("");
    const form = new FormData();
    form.set("id", id);
    form.set("stato", value);
    startTransition(async () => {
      try {
        const result = await feedbackStateAction(form);
        if (result.ok) setCurrent(value);
        else setError(result.error);
      } catch {
        setError("Modifica non riuscita. Controlla la connessione e riprova.");
      }
    });
  };

  return (
    <>
      <div role="group" aria-label="Stato della segnalazione" className="flex flex-wrap gap-2">
        {BUTTONS.map(button => {
          const on = current === button.value;
          return (
            <button key={button.value} type="button" aria-pressed={on} disabled={pending} onClick={() => change(button.value)}
              className={`inline-flex min-h-11 items-center rounded-[22px] border-[1.5px] px-4 text-[15px] font-semibold disabled:opacity-60 ${on ? "border-primary bg-primary text-primary-foreground" : `bg-card ${button.tone}`}`}>
              {button.label}
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-primary">{error}</p>}

      <form action={saveNote} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={id} />
        <label htmlFor="nota" className="text-sm font-bold">Nota privata</label>
        <textarea id="nota" name="nota" defaultValue={nota} rows={4} maxLength={NOTE_MAX} placeholder="Visibile solo nell’amministrazione"
          className="min-h-20 rounded-[14px] border-[1.5px] border-border bg-card px-3.5 py-3 text-base outline-none focus:border-primary" />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={savingNote} className="inline-flex min-h-11 items-center rounded-[22px] border-[1.5px] border-primary px-4 text-[15px] font-semibold text-primary disabled:opacity-60">
            {savingNote ? "Salvataggio…" : "Salva nota"}
          </button>
          {noteState && <span role="status" className={`text-sm ${noteState.ok ? "text-muted" : "font-semibold text-primary"}`}>{noteState.ok ? noteState.message : noteState.error}</span>}
        </div>
      </form>

      <form className="mt-4" action={formData => {
        startTransition(async () => {
          try {
            const result = await deleteFeedbackAction(formData);
            if (result.ok) router.replace("/admin/segnalazioni");
            else setError(result.error);
          } catch {
            setError("Eliminazione non riuscita. Controlla la connessione e riprova.");
          }
        });
      }} onSubmit={event => { if (!confirm("Eliminare questa segnalazione? L’operazione è definitiva.")) event.preventDefault(); }}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center text-sm font-bold text-[#A33] disabled:opacity-60">Elimina segnalazione</button>
      </form>
    </>
  );
}
