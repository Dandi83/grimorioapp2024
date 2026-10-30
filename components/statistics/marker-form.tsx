"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addMarkerAction, type MarkerResult } from "@/app/actions/admin-statistics";

/** «+ Segna un evento»: opens a small form (day, hour if known, short text) under the chart. */
export function MarkerForm({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<MarkerResult | null, FormData>(addMarkerAction, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) { form.current?.reset(); setOpen(false); }
  }, [state]);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-full border border-[#7A1F2B] px-4 text-sm font-bold text-[#7A1F2B]">
        + Segna un evento
      </button>
    );
  }
  return (
    <form ref={form} action={action} className="space-y-3 rounded-xl border border-[#DDCFAE] bg-[#F6EFDF] p-3" aria-label="Segna un evento">
      <label className="block text-sm font-semibold text-[#2B2118]">
        Giorno
        <input type="date" name="giorno" required defaultValue={today} max={today} className="mt-1 block min-h-11 w-full rounded-lg border border-[#DDCFAE] bg-[#FFFBF0] px-3 text-base" />
      </label>
      <label className="block text-sm font-semibold text-[#2B2118]">
        Ora (facoltativa)
        <select name="ora" defaultValue="" className="mt-1 block min-h-11 w-full rounded-lg border border-[#DDCFAE] bg-[#FFFBF0] px-3 text-base">
          <option value="">Non so / tutto il giorno</option>
          {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{`${String(hour).padStart(2, "0")}:00`}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold text-[#2B2118]">
        Cosa è successo
        <input type="text" name="etichetta" required minLength={2} maxLength={60} placeholder="Es. Post su Instagram" className="mt-1 block min-h-11 w-full rounded-lg border border-[#DDCFAE] bg-[#FFFBF0] px-3 text-base" />
      </label>
      {state && !state.ok && <p role="alert" className="text-sm font-semibold text-[#7A1F2B]">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="min-h-11 flex-1 rounded-full bg-[#7A1F2B] px-4 text-sm font-bold text-[#FFFBF0] disabled:opacity-60">Salva l’evento</button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-full border border-[#DDCFAE] px-4 text-sm font-semibold text-[#5E4E3E]">Annulla</button>
      </div>
    </form>
  );
}
