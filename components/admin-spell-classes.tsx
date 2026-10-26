"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { applySpellClassesAction } from "@/app/actions/admin-spell-classes";
import type { ApplyClassesResult } from "@/lib/spell-classes-2014";
import type { SpellClassesPlan } from "@/lib/spell-classes-2014-plan";

/**
 * «Classi incantesimi 2014» in /admin (administrator only, never cached): the preview before → after of the
 * «livello» of the spells added without classes and of one name, the ones it skips, and «Applica».
 */
export function AdminSpellClasses({ plan, rename }: { plan: SpellClassesPlan; rename: { id: string; from: string; to: string } }) {
  const router = useRouter();
  const [result, setResult] = useState<ApplyClassesResult | null>(null);
  const [pending, start] = useTransition();
  const apply = () => start(async () => {
    try {
      setResult(await applySpellClassesAction());
    } catch {
      setResult({ ok: false, error: "Non riuscito: controlla la connessione e di essere ancora entrato." });
    }
    router.refresh();
  });
  return (
    <section aria-labelledby="classi-2014" data-spell-classes-2014="" className="mt-5 rounded-[14px] border-2 border-amber bg-card p-4">
      <h2 id="classi-2014" className="font-serif text-[22px] font-bold text-primary">Classi incantesimi 2014</h2>
      <p className="mt-1 text-[15px] leading-6 text-muted">Operazione una tantum: aggiunge le classi tra parentesi al livello di {plan.changes.length} incantesimi aggiunti da te{plan.rename ? " e corregge un nome" : ""}. Prima di scrivere salva i valori nel Registro modifiche, dove ogni campo si può annullare.</p>
      {result && (
        <p role="status" className={`mt-3 rounded-[10px] px-3 py-2 text-[15px] font-semibold ${result.ok ? "bg-[#E6EFD9] text-[#2F4A1C]" : "bg-primary/10 text-primary"}`}>
          {result.ok ? `Fatto: ${result.changed} livelli modificati${result.renamed ? ", 1 nome corretto" : ""}, ${result.skipped.length} saltati.` : result.error}
        </p>
      )}
      {plan.changes.length > 0 && (
        <ol className="mt-3 max-h-80 space-y-1.5 overflow-y-auto text-[14px] leading-5" aria-label="Anteprima del livello">
          {plan.changes.map(change => (
            <li key={change.id} data-classes-change={change.id}>
              <span className="font-semibold">{change.id}</span>: «{change.before}» → «<span className="text-primary">{change.after}</span>»
            </li>
          ))}
        </ol>
      )}
      {plan.rename && <p className="mt-2 text-[14px]" data-classes-rename=""><span className="font-semibold">{rename.id}</span> (nome): «{rename.from}» → «<span className="text-primary">{rename.to}</span>»</p>}
      {plan.skipped.length > 0 && (
        <details className="mt-2 text-[14px]">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">Saltati: {plan.skipped.length}</summary>
          <ul className="space-y-1" aria-label="Incantesimi saltati">
            {plan.skipped.map(item => <li key={item.id} data-classes-skipped={item.id}><span className="font-semibold">{item.id}</span>: {item.reason}</li>)}
          </ul>
        </details>
      )}
      <button type="button" onClick={apply} disabled={pending} className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-[12px] bg-primary px-4 text-[16px] font-bold text-primary-foreground disabled:opacity-60">
        {pending ? "Applico…" : "Applica"}
      </button>
    </section>
  );
}
