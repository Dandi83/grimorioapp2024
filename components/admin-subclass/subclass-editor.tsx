"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

import { createSubclassAction, updateSubclassAction } from "@/app/actions/admin-subclasses";
import { AddedSubclassCard } from "@/components/classes/subclass-card";
import { SUBCLASS_LIMITS, type SubclassDraft, type SubclassEntry, type SubclassFeature } from "@/lib/subclass-types";

const input = "min-h-11 w-full rounded-[10px] border-[1.5px] border-border bg-background px-3 text-[16px]";
const area = "min-h-28 w-full rounded-[10px] border-[1.5px] border-border bg-background px-3 py-2 text-[16px] leading-6";
const small = "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-[10px] border-[1.5px] border-chip-border bg-card px-2 text-sm font-semibold text-primary disabled:opacity-40";

/** Moves one item of a list up (-1) or down (+1). */
function move<T>(list: T[], index: number, step: -1 | 1): T[] {
  const target = index + step;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * The editor of a subclass added by the administrator: the structure of the SRD subclasses (name, introduction,
 * features by level, entries with name and text inside a feature), plain text only; the preview below is the
 * public card (components/classes/subclass-card.tsx). A new one is saved hidden.
 */
export function SubclassEditor({ id, initial, from, back }: { id?: string; initial: SubclassDraft; from: number; back: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const setFeature = (index: number, change: Partial<SubclassFeature>) =>
    setDraft(current => ({ ...current, privilegi: current.privilegi.map((feature, i) => (i === index ? { ...feature, ...change } : feature)) }));
  const setEntries = (index: number, voci: SubclassEntry[]) => setFeature(index, { voci });

  const save = () => {
    setError("");
    startTransition(async () => {
      try {
        const result = id ? await updateSubclassAction(id, draft) : await createSubclassAction(draft);
        if (!result.ok) { setError(result.error); return; }
        router.push(back);
        router.refresh();
      } catch {
        setError("Salvataggio non riuscito. Controlla la connessione e riprova.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-bold">Nome della sottoclasse *</span>
        <input id="subclass-nome" className={input} value={draft.nome} maxLength={SUBCLASS_LIMITS.nome} onChange={event => setDraft({ ...draft, nome: event.target.value })} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-bold">Testo introduttivo</span>
        <textarea id="subclass-descrizione" className={area} value={draft.descrizione} maxLength={SUBCLASS_LIMITS.descrizione} onChange={event => setDraft({ ...draft, descrizione: event.target.value })} />
        <span className="text-[13px] text-muted">Testo semplice: una riga vuota separa i paragrafi. Condizioni, incantesimi e danni diventano richiami da soli.</span>
      </label>

      <h2 className="mt-2 font-serif text-[22px] font-bold text-primary">Privilegi</h2>
      <ol className="flex flex-col gap-3" aria-label="Privilegi della sottoclasse">
        {draft.privilegi.map((feature, index) => {
          const n = index + 1;
          return (
            <li key={index} className="flex flex-col gap-2 rounded-[14px] border-[1.5px] border-amber bg-card p-3" data-feature-editor="">
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex w-28 flex-col gap-1">
                  <span className="text-sm font-bold">Livello</span>
                  <select aria-label={`Livello del privilegio ${n}`} className={input} value={feature.livello} onChange={event => setFeature(index, { livello: Number(event.target.value) })}>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map(level => <option key={level} value={level}>{level}</option>)}
                  </select>
                </label>
                <div className="ml-auto flex gap-1.5">
                  <button type="button" className={small} aria-label={`Sposta su il privilegio ${n}`} disabled={index === 0} onClick={() => setDraft({ ...draft, privilegi: move(draft.privilegi, index, -1) })}><ArrowUp size={16} aria-hidden="true" /></button>
                  <button type="button" className={small} aria-label={`Sposta giù il privilegio ${n}`} disabled={index === draft.privilegi.length - 1} onClick={() => setDraft({ ...draft, privilegi: move(draft.privilegi, index, 1) })}><ArrowDown size={16} aria-hidden="true" /></button>
                  <button type="button" className={small} aria-label={`Togli il privilegio ${n}`} onClick={() => setDraft({ ...draft, privilegi: draft.privilegi.filter((_, i) => i !== index) })}><X size={16} aria-hidden="true" /></button>
                </div>
              </div>
              <input aria-label={`Nome del privilegio ${n}`} placeholder="Nome del privilegio" className={input} value={feature.nome} maxLength={SUBCLASS_LIMITS.featureName} onChange={event => setFeature(index, { nome: event.target.value })} />
              <textarea aria-label={`Testo del privilegio ${n}`} placeholder="Testo del privilegio" className={area} value={feature.testo} maxLength={SUBCLASS_LIMITS.featureText} onChange={event => setFeature(index, { testo: event.target.value })} />
              {feature.voci.length > 0 && (
                <ol className="flex flex-col gap-2 border-l-2 border-amber pl-3" aria-label={`Voci del privilegio ${n}`}>
                  {feature.voci.map((entry, j) => {
                    const m = j + 1;
                    const setEntry = (change: Partial<SubclassEntry>) => setEntries(index, feature.voci.map((item, k) => (k === j ? { ...item, ...change } : item)));
                    return (
                      <li key={j} className="flex flex-col gap-1.5">
                        <div className="flex gap-1.5">
                          <input aria-label={`Nome della voce ${m} del privilegio ${n}`} placeholder="Nome della voce" className={input} value={entry.nome} maxLength={SUBCLASS_LIMITS.entryName} onChange={event => setEntry({ nome: event.target.value })} />
                          <button type="button" className={small} aria-label={`Sposta su la voce ${m} del privilegio ${n}`} disabled={j === 0} onClick={() => setEntries(index, move(feature.voci, j, -1))}><ArrowUp size={16} aria-hidden="true" /></button>
                          <button type="button" className={small} aria-label={`Sposta giù la voce ${m} del privilegio ${n}`} disabled={j === feature.voci.length - 1} onClick={() => setEntries(index, move(feature.voci, j, 1))}><ArrowDown size={16} aria-hidden="true" /></button>
                          <button type="button" className={small} aria-label={`Togli la voce ${m} del privilegio ${n}`} onClick={() => setEntries(index, feature.voci.filter((_, k) => k !== j))}><X size={16} aria-hidden="true" /></button>
                        </div>
                        <textarea aria-label={`Testo della voce ${m} del privilegio ${n}`} placeholder="Testo della voce" className={area} value={entry.testo} maxLength={SUBCLASS_LIMITS.entryText} onChange={event => setEntry({ testo: event.target.value })} />
                      </li>
                    );
                  })}
                </ol>
              )}
              <button type="button" className={`${small} self-start px-3`} disabled={feature.voci.length >= SUBCLASS_LIMITS.entries}
                onClick={() => setEntries(index, [...feature.voci, { nome: "", testo: "" }])}><Plus size={16} aria-hidden="true" />Aggiungi voce<span className="sr-only"> al privilegio {n}</span></button>
            </li>
          );
        })}
      </ol>
      <button type="button" className={`${small} self-start px-3`} disabled={draft.privilegi.length >= SUBCLASS_LIMITS.features}
        onClick={() => setDraft({ ...draft, privilegi: [...draft.privilegi, { livello: draft.privilegi.at(-1)?.livello ?? from, nome: "", testo: "", voci: [] }] })}>
        <Plus size={16} aria-hidden="true" />Aggiungi privilegio
      </button>

      <section aria-labelledby="anteprima-sottoclasse" className="mt-2 flex flex-col gap-2">
        <h2 id="anteprima-sottoclasse" className="font-serif text-[22px] font-bold text-primary">Anteprima</h2>
        <p className="text-[13px] text-muted">Come la vedrà il pubblico quando la mostri. I privilegi senza nome, testo e voci non compaiono.</p>
        <AddedSubclassCard draft={draft} from={from} />
      </section>

      {error && <p role="alert" className="rounded-[12px] border border-primary bg-primary/10 px-3 py-2 text-[15px] font-semibold text-primary">{error}</p>}
      <div className="sticky bottom-[calc(12px+env(safe-area-inset-bottom,0px))] flex gap-2 rounded-[14px] bg-background/95 py-2">
        <button type="button" onClick={save} disabled={pending} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-[12px] bg-primary px-4 text-[16px] font-bold text-primary-foreground disabled:opacity-60">
          {pending ? "Salvataggio…" : id ? "Salva modifiche" : "Crea sottoclasse (nascosta)"}
        </button>
        <a href={back} className="inline-flex min-h-12 items-center justify-center rounded-[12px] border-[1.5px] border-border px-4 text-[16px] font-bold text-primary">Annulla</a>
      </div>
    </div>
  );
}
