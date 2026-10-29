"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setVerifiedAction } from "@/app/actions/admin-homebrew";

/** /admin/bilanciamento: the green pill of a card on or off (on only with the saved verdict «In linea»). */
export function VerifiedToggle({ id, shown, possible }: { id: string; shown: boolean; possible: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  if (!shown && !possible) return <span className="text-[13px] text-[#5E4E3E]" data-verified-state="no">Pillola «Bilanciamento verificato»: non prevista (giudizio salvato non «In linea»)</span>;
  return (
    <span className="flex flex-wrap items-center gap-2 text-[13px]" data-verified-state={shown ? "si" : "no"}>
      <span>Pillola «Bilanciamento verificato»: <b>{shown ? "mostrata" : "tolta"}</b></span>
      <button type="button" disabled={pending} data-verified-toggle={id}
        onClick={() => start(async () => { const result = await setVerifiedAction(id, !shown); if (!result.ok) setError(result.error); else router.refresh(); })}
        className="min-h-11 rounded-[8px] border border-[#7A4E00] px-3 font-semibold text-[#7A4E00] disabled:opacity-60">
        {shown ? "Togli la pillola" : "Mostra la pillola"}
      </button>
      {error && <span role="status" className="font-semibold text-[#7A1F2B]">{error}</span>}
    </span>
  );
}
