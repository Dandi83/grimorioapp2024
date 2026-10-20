"use client";
import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { findConditions } from "@/lib/conditions";
import type { ManualEntry } from "@/lib/manual-types";
import { ManualContent } from "@/components/manual-content";

export function ConditionReferences({ text }: { text: string }) {
  const matches = findConditions(text);
  const [selected, setSelected] = useState<ManualEntry | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (selected && !element.open) element.showModal();
    if (!selected && element.open) element.close();
  }, [selected]);
  if (!matches.length) return null;
  return <div className="my-5 rounded-xl border border-primary/25 bg-card p-4">
    <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-primary">Condizioni citate</p>
    <div className="flex flex-wrap gap-2">{matches.map(condition => <button key={condition.id} type="button" aria-haspopup="dialog" onClick={() => setSelected(condition)} className="rounded-full border border-border px-3 py-2 text-sm text-foreground transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">{condition.title}</button>)}</div>
    <dialog ref={dialog} aria-labelledby={titleId} onCancel={() => setSelected(null)} onClose={() => setSelected(null)} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-32px)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-background p-5 text-foreground shadow-2xl backdrop:bg-[#2B2118]/50">
      {selected && <>
        <div className="mb-5 flex items-start justify-between gap-4"><h2 id={titleId} className="font-serif text-3xl font-bold">{selected.title}</h2><button type="button" onClick={() => setSelected(null)} aria-label="Chiudi condizione" className="rounded-full p-2 text-muted hover:text-primary"><X size={22}/></button></div>
        <ManualContent entry={selected}/>
      </>}
    </dialog>
  </div>;
}
