"use client";

import { useActionState, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { setSrdOnlyAction } from "@/app/actions/admin-srd-only";

export interface SrdOnlyCounts {
  totale: number;
  sintesi: { incantesimi: number; mostri: number };
  aggiunte: { incantesimi: number; mostri: number };
  modificate: { incantesimi: number; mostri: number };
  nomiInglesi: number;
  giaNascoste: number;
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("it-IT")} ${n === 1 ? one : many}`;

/**
 * «Modalità solo SRD» (PROMPT 39), the last card of /admin: the state, what it hides (counted now), and the switch.
 * «Attiva» / «Disattiva» only asks; «Conferma», in the same card, does it; «Annulla» changes nothing.
 */
export function SrdOnlyCard({ attiva, dal, quanti, counts }: { attiva: boolean; dal: string | null; quanti: number; counts: SrdOnlyCounts }) {
  const [asking, setAsking] = useState(false);
  const [result, confirm, saving] = useActionState(setSrdOnlyAction, null);
  const n = attiva ? quanti : counts.totale;
  const rows: [string, number, number][] = [
    ["Sintesi originali", counts.sintesi.incantesimi, counts.sintesi.mostri],
    ["Schede aggiunte da te fuori dall’SRD", counts.aggiunte.incantesimi, counts.aggiunte.mostri],
    ["Schede SRD modificate (non più testo SRD)", counts.modificate.incantesimi, counts.modificate.mostri],
  ];
  return (
    <section id="solo-srd" aria-labelledby="solo-srd-titolo" data-srd-only={attiva ? "accesa" : "spenta"}
      className={`mt-3 scroll-mt-20 rounded-[18px] border-[1.5px] p-4 ${attiva ? "border-[#7A1F2B] bg-[#F8E1E1]" : "border-[#DDCFAE] bg-[#FFFBF0]"}`}>
      <div className="flex items-start gap-3">
        <ShieldAlert size={26} strokeWidth={1.8} className="mt-0.5 shrink-0 text-[#7A1F2B]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="solo-srd-titolo" className="font-serif text-[22px] font-bold leading-tight text-[#2B2118]">Modalità solo SRD</h2>
          <p className="text-[14px] font-bold" data-srd-only-state="">
            {attiva ? <span className="text-[#7A1F2B]">Accesa{dal ? ` dalle ${dal}` : ""} · {plural(quanti, "contenuto nascosto", "contenuti nascosti")}</span> : <span className="text-[#5E4E3E]">Spenta</span>}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[15px] leading-6 text-[#2B2118]">Nasconde subito a tutti i visitatori ciò che non viene dall’SRD. Tutto resta salvato: si riaccende con un tocco.</p>
      <ul data-srd-only-counts="" className="mt-2 flex flex-col gap-1 text-[14px] text-[#2B2118]">
        {rows.map(([label, spells, monsters]) => (
          <li key={label} className="flex justify-between gap-3 border-b border-[#DDCFAE]/70 pb-1">
            <span>{label}</span>
            <span className="shrink-0 tabular-nums text-[#5E4E3E]">{plural(spells, "incantesimo", "incantesimi")} · {plural(monsters, "mostro", "mostri")}</span>
          </li>
        ))}
        <li className="flex justify-between gap-3 border-b border-[#DDCFAE]/70 pb-1">
          <span>Nomi inglesi approvati (escono dalla ricerca)</span><span className="shrink-0 tabular-nums text-[#5E4E3E]">{counts.nomiInglesi.toLocaleString("it-IT")}</span>
        </li>
        <li className="flex justify-between gap-3">
          <span>Già nascoste una per una (restano nascoste)</span><span className="shrink-0 tabular-nums text-[#5E4E3E]">{counts.giaNascoste.toLocaleString("it-IT")}</span>
        </li>
        <li className="flex justify-between gap-3 pt-1 font-bold">
          <span>Totale</span><span className="shrink-0 tabular-nums" data-srd-only-total="">{plural(counts.totale, "contenuto", "contenuti")}</span>
        </li>
      </ul>
      <p className="mt-2 text-[13px] leading-5 text-[#5E4E3E]">Non tocca l’SRD, i mostri della redazione, le creature della community, le statistiche e l’area riservata.</p>
      {!asking ? (
        <button type="button" onClick={() => setAsking(true)} disabled={saving}
          className={`mt-3 min-h-12 w-full rounded-full px-4 text-[16px] font-bold ${attiva ? "border-[1.5px] border-[#7A1F2B] bg-[#FFFBF0] text-[#7A1F2B]" : "bg-[#7A1F2B] text-[#FFFBF0]"}`}>
          {attiva ? "Disattiva modalità solo SRD" : "Attiva modalità solo SRD"}
        </button>
      ) : (
        <form action={form => { setAsking(false); confirm(form); }} data-srd-only-confirm="" className="mt-3 rounded-[14px] border-[1.5px] border-[#7A1F2B] bg-[#FFFBF0] p-3">
          <input type="hidden" name="attiva" value={attiva ? "0" : "1"} />
          <p role="alert" className="text-[15px] font-semibold leading-6 text-[#2B2118]">
            {attiva
              ? `Mostrare di nuovo ${plural(n, "contenuto", "contenuti")} a tutti? Tornano come prima; quelli nascosti uno per uno restano nascosti.`
              : `Nascondere ${plural(n, "contenuto", "contenuti")} a tutti? Spariscono da liste, ricerca, preferiti e copie offline.`}
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setAsking(false)} className="min-h-11 flex-1 rounded-full border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] px-4 text-[15px] font-bold text-[#2B2118]">Annulla</button>
            <button type="submit" className="min-h-11 flex-1 rounded-full bg-[#7A1F2B] px-4 text-[15px] font-bold text-[#FFFBF0]">Conferma</button>
          </div>
        </form>
      )}
      {saving && <p className="mt-2 text-[14px] text-[#5E4E3E]" role="status">Salvataggio…</p>}
      {result?.error && <p role="alert" className="mt-2 text-[14px] font-semibold text-[#8E1B1B]">{result.error}</p>}
    </section>
  );
}
