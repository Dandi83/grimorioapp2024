"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { recalculateVerdictAction, setVerifiedAction } from "@/app/actions/admin-homebrew";

const SAVED_LABEL: Record<string, string> = { "in linea": "In linea", "da controllare": "Da controllare", fuori: "Fuori dal GS" };

/**
 * /admin/bilanciamento (PROMPT 26), for each homebrew: the saved verdict, «Ricalcola» (the verdict of the sheet as it is
 * now, saved) and the box «Mostra "Bilanciamento verificato"», enabled only with the saved verdict «In linea» (for
 * «2014 e 2024», in line in both editions). The pill stays a choice of the administrator.
 */
export function VerifiedToggle({ id, shown, saved }: { id: string; shown: boolean; saved: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const possible = saved === "in linea";
  // The box follows the click at once; the page keys this by the saved state, so a refresh starts it again from it.
  const [checked, setChecked] = useState(shown);
  const run = (action: () => Promise<{ ok: true } | { ok: false; error: string }>) => start(async () => {
    setError("");
    const result = await action();
    if (!result.ok) { setError(result.error); setChecked(shown); } else router.refresh();
  });
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]" data-verified-state={checked ? "si" : "no"} data-saved-verdict={saved ?? "nessuno"}>
      <span>Giudizio salvato: <b>{saved ? SAVED_LABEL[saved] ?? saved : "nessuno"}</b></span>
      <button type="button" disabled={pending} data-recalculate={id} onClick={() => run(() => recalculateVerdictAction(id))}
        className="min-h-11 rounded-[8px] border border-[#7A4E00] px-3 font-semibold text-[#7A4E00] disabled:opacity-60">
        {pending ? "Calcolo…" : "Ricalcola"}
      </button>
      <label className="flex min-h-11 items-center gap-2" data-verified-box={id}>
        <input type="checkbox" className="size-5 accent-[#1F6B45]" checked={checked} disabled={pending || (!possible && !shown)}
          onChange={event => { const next = event.target.checked; setChecked(next); run(() => setVerifiedAction(id, next)); }} />
        <span>Mostra «Bilanciamento verificato»{!possible && !shown ? <span className="text-[#5E4E3E]"> · solo con il giudizio salvato «In linea»</span> : null}</span>
      </label>
      {error && <span role="status" className="font-semibold text-[#7A1F2B]">{error}</span>}
    </span>
  );
}
