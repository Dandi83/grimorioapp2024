"use client";

import { Check } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type TableVote = "facile" | "giusto" | "difficile";
type Counts = Record<TableVote, number> & { total: number };

const CHOICES: { vote: TableVote; label: string; color: string }[] = [
  { vote: "facile", label: "Troppo facile", color: "#E0A21A" },
  { vote: "giusto", label: "Giusto", color: "#1F6B45" },
  { vote: "difficile", label: "Troppo difficile", color: "#7A1F2B" },
];
const KEY = (id: string) => `grimorio.prova-tavolo.${id}`;

/**
 * «L'hai provato al tavolo?» (PROMPT 19), at the bottom of every card of «I mostri creati da voi»: easy, right or hard
 * for its CR. One vote per device and card, changeable (the choice is remembered here, the server keeps one per
 * device); sent like the other events of the statistics, never from the administrator's devices or after «No». The
 * count of the masters appears from 5 votes on.
 */
export function TableTest({ id }: { id: string }) {
  const [vote, setVote] = useState<TableVote | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [threshold, setThreshold] = useState(5);

  const load = useCallback(() => {
    fetch(`/api/prove-tavolo?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(response => (response.ok ? response.json() : null))
      .then((data: { threshold?: number; counts?: Counts | null } | null) => {
        if (!data) return;
        if (typeof data.threshold === "number") setThreshold(data.threshold);
        setCounts(data.counts ?? null);
      })
      .catch(() => undefined);
  }, [id]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY(id));
      if (saved === "facile" || saved === "giusto" || saved === "difficile") setVote(saved);
    } catch { /* no storage: the choice is not remembered */ }
    load();
    const saved = () => load();
    window.addEventListener("grimorio:prova-tavolo-salvata", saved);
    return () => window.removeEventListener("grimorio:prova-tavolo-salvata", saved);
  }, [id, load]);

  const choose = (next: TableVote) => {
    if (next === vote) return;
    setVote(next);
    try { localStorage.setItem(KEY(id), next); } catch { /* no storage */ }
    window.dispatchEvent(new CustomEvent("grimorio:analytics-event", { detail: { event: "prova_tavolo", vote: next } }));
  };

  return (
    <section aria-labelledby="table-test-title" data-table-test={id} className="mx-6 mb-6 rounded-[16px] border border-[#DDCFAE] bg-[#FFFBF0] p-4">
      <h2 id="table-test-title" className="font-serif text-[22px] font-bold leading-tight text-[#2B2118]">L’hai provato al tavolo?</h2>
      <p className="mt-1 text-[15px] leading-6 text-[#5E4E3E]">Com’è andata rispetto al suo Grado di sfida?</p>
      <div role="group" aria-label="Com’è andata al tavolo" className="mt-3 grid grid-cols-3 gap-2">
        {CHOICES.map(choice => {
          const on = vote === choice.vote;
          return (
            <button key={choice.vote} type="button" aria-pressed={on} data-table-vote={choice.vote} onClick={() => choose(choice.vote)}
              className="flex min-h-[52px] items-center justify-center gap-1 rounded-[12px] border-2 bg-white px-1.5 text-center text-[14px] font-bold leading-tight text-[#2B2118]"
              style={{ borderColor: on ? choice.color : "#DDCFAE" }}>
              {on && <Check size={16} strokeWidth={3} aria-hidden="true" style={{ color: choice.color }} />}
              {choice.label}
            </button>
          );
        })}
      </div>
      {counts ? (
        <div className="mt-3" data-table-counts={counts.total}>
          <p className="text-[14px] font-bold text-[#2B2118]">Provato da {counts.total.toLocaleString("it-IT")} master</p>
          <div role="img" aria-label={`Troppo facile ${counts.facile}, giusto ${counts.giusto}, troppo difficile ${counts.difficile}.`}
            className="mt-1.5 flex h-3 w-full overflow-hidden rounded-full bg-[#EDE3CC]">
            {CHOICES.filter(choice => counts[choice.vote] > 0).map(choice => (
              <span key={choice.vote} className="h-full" style={{ width: `${(counts[choice.vote] / counts.total) * 100}%`, backgroundColor: choice.color }} />
            ))}
          </div>
          <p className="mt-1 text-[13px] text-[#5E4E3E]">facile {counts.facile} · giusto {counts.giusto} · difficile {counts.difficile}</p>
        </div>
      ) : (
        <p className="mt-3 text-[13px] leading-5 text-[#5E4E3E]" data-table-waiting="">Un voto per dispositivo, puoi cambiarlo. Il conteggio compare dopo {threshold} prove.</p>
      )}
    </section>
  );
}
