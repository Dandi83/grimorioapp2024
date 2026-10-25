"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

import { setCardVisibilityAction } from "@/app/actions/admin-cards";

export type CardKind = "incantesimo" | "mostro" | "sottoclasse";
export type VisibilityFilter = "tutte" | "visibili" | "nascoste";

interface Toast { at: number; text: string; label?: string; undo?: () => void }

/**
 * The eye of the admin lists and editors: one tap hides a card from the site (or shows it again) at once,
 * then a short notice with «Annulla». The state is kept here while the server saves it; when saving fails
 * the tap is undone and the notice says so. hidden: the ids hidden when the page was loaded.
 */
export function useCardVisibility(kind: CardKind, hidden: readonly string[]) {
  const [ids, setIds] = useState(() => new Set(hidden));
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = useCallback((next: Toast) => {
    clearTimeout(timer.current);
    setToast(next);
    timer.current = setTimeout(() => setToast(null), 6000);
  }, []);

  // «Annulla» calls the same switch back: through a ref, so the callback does not refer to itself.
  const setRef = useRef<(id: string, nome: string, hide: boolean, withUndo?: boolean) => Promise<void>>(undefined);
  const set = useCallback(async (id: string, nome: string, hide: boolean, withUndo = true) => {
    const apply = (value: boolean) => setIds(current => {
      const next = new Set(current);
      if (value) next.add(id); else next.delete(id);
      return next;
    });
    apply(hide);
    const undo = withUndo ? () => void setRef.current?.(id, nome, !hide, false) : undefined;
    show({ at: Date.now(), text: hide ? "Nascosta dal sito" : "Di nuovo visibile sul sito", label: nome, undo });
    try {
      const result = await setCardVisibilityAction(kind, id, hide);
      if (!result.ok) throw new Error(result.error);
    } catch {
      apply(!hide);
      show({ at: Date.now(), text: "Salvataggio non riuscito: la scheda è rimasta com’era." });
    }
  }, [kind, show]);
  useEffect(() => { setRef.current = set; }, [set]);

  const isHidden = useCallback((id: string) => ids.has(id), [ids]);
  const toggle = useCallback((id: string, nome: string) => void set(id, nome, !ids.has(id)), [ids, set]);
  const notice: ReactNode = toast && (
    <div role="status" key={toast.at} className="fixed inset-x-0 bottom-[calc(16px+env(safe-area-inset-bottom,0px))] z-[60] mx-auto flex w-[calc(100%-32px)] max-w-md items-center gap-3 rounded-[12px] bg-[#2B2118] py-1 pl-4 pr-1 text-[15px] font-semibold text-[#FFFBF0] shadow-lg">
      <span className="min-w-0 flex-1 break-words py-2">{toast.text}{toast.label && <span className="sr-only">: {toast.label}</span>}</span>
      {toast.undo && (
        <button type="button" onClick={() => { const undo = toast.undo; setToast(null); undo?.(); }} className="min-h-11 shrink-0 rounded-[10px] px-3 font-bold text-amber underline underline-offset-4">Annulla</button>
      )}
    </div>
  );
  return { isHidden, toggle, notice, count: ids.size };
}

/** Open eye: visible on the site; crossed out: hidden. At least 44 px to tap. */
export function EyeButton({ hidden, nome, onToggle }: { hidden: boolean; nome: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={hidden}
      aria-label={hidden ? `Mostra sul sito: ${nome}` : `Nascondi dal sito: ${nome}`}
      title={hidden ? "Nascosta: tocca per mostrarla sul sito" : "Visibile: tocca per nasconderla dal sito"}
      className={`grid size-11 shrink-0 place-items-center rounded-md transition-colors ${hidden ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
      data-card-eye=""
    >
      {hidden ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
    </button>
  );
}

/** «Tutte · Visibili · Nascoste» above a list, with the number of hidden cards of the edition. */
export function VisibilityFilterBar({ value, onChange, hiddenCount }: { value: VisibilityFilter; onChange: (value: VisibilityFilter) => void; hiddenCount: number }) {
  const options: [VisibilityFilter, string][] = [["tutte", "Tutte"], ["visibili", "Visibili"], ["nascoste", `Nascoste · ${hiddenCount}`]];
  return (
    <div role="group" aria-label="Visibilità sul sito" className="mb-3 flex flex-wrap gap-2">
      {options.map(([key, label]) => (
        <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)}
          className={`inline-flex min-h-11 items-center rounded-[22px] border-[1.5px] px-3.5 text-sm font-semibold ${value === key ? "border-primary bg-primary text-primary-foreground" : "border-chip-border bg-card text-primary"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** The cards of a list that match the filter. */
export function useVisibilityFilter<T extends { id: string }>(list: T[], filter: VisibilityFilter, isHidden: (id: string) => boolean) {
  return useMemo(() => (filter === "tutte" ? list : list.filter(item => isHidden(item.id) === (filter === "nascoste"))), [list, filter, isHidden]);
}
