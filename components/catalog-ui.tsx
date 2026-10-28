"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Filter, Search, X } from "lucide-react";

import { SectionEditionPill } from "@/components/edition/edition-pill";
import { SEARCH_INPUT } from "@/lib/search-input";

/**
 * Shared catalog header: serif title, 2024 | 2014 edition selector and a 4 px bordeaux rule.
 * section: an edition hidden there (/admin/sezioni) has no button; with one left there is no selector.
 */
export function CatalogTitle({ title, section, edition, onEdition }: {
  title: string;
  section: string;
  edition?: "2024" | "2014";
  onEdition?: (value: "2024" | "2014") => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b-4 border-primary pb-3">
      <h1 className="min-w-0 font-serif text-[40px] font-bold leading-tight text-foreground">{title}</h1>
      {edition && onEdition && <SectionEditionPill section={section} edition={edition} choose={onEdition} />}
    </div>
  );
}

/** Search field and "Filtri" button; the button turns bordeaux with an amber count when filters are active. */
export function SearchAndFilters({ query, onQuery, label, active, onOpen, placeholder = "Cerca per nome…" }: {
  query: string;
  onQuery: (value: string) => void;
  label: string;
  active: number;
  onOpen: () => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-4 flex gap-3">
      <div className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-[8px] border border-border-strong bg-card px-3">
        <Search size={20} className="shrink-0 text-muted" aria-hidden="true" />
        <input
          value={query}
          onChange={event => onQuery(event.target.value)}
          {...SEARCH_INPUT}
          aria-label={label}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted"
        />
        {query.length > 0 && (
          <button type="button" onClick={() => onQuery("")} aria-label="Cancella ricerca" className="-mr-2 grid size-11 shrink-0 place-items-center">
            <X size={18} className="text-muted" aria-hidden="true" />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={active ? `Filtri, ${active} ${active === 1 ? "attivo" : "attivi"}` : "Filtri"}
        className={`flex min-h-12 shrink-0 items-center gap-2 rounded-[8px] border px-4 text-base font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-elevated text-foreground"}`}
      >
        <Filter size={18} aria-hidden="true" />
        Filtri
        {active > 0 && <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-amber text-[13px] font-bold text-foreground">{active}</span>}
      </button>
    </div>
  );
}

export type ActiveFilter = { key: string; label: string; remove: () => void };

/** Active filters as removable labels; nothing is shown without filters. */
export function ActiveFilters({ filters }: { filters: ActiveFilter[] }) {
  if (!filters.length) return null;
  return (
    <ul aria-label="Filtri attivi" className="no-scrollbar -mx-6 mt-3 flex gap-2 overflow-x-auto px-6">
      {filters.map(filter => (
        <li key={filter.key} className="shrink-0">
          <button
            type="button"
            onClick={filter.remove}
            aria-label={`Togli il filtro ${filter.label}`}
            className="flex min-h-11 items-center gap-2 rounded-[8px] border-2 border-border bg-card px-3 text-[15px] font-semibold text-foreground"
          >
            {filter.label}
            <X size={16} className="text-primary" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Bottom sheet with the filter groups, "Azzera" on top and the result button fixed at the bottom. */
export function FilterSheet({ open, onClose, onReset, onApply, count, children }: {
  open: boolean;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
  count: number;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      if (typeof element.showModal === "function") element.showModal();
      else element.setAttribute("open", "");
    }
    if (!open && element.open) {
      if (typeof element.close === "function") element.close();
      else element.removeAttribute("open");
    }
  }, [open]);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[88dvh] w-full max-w-2xl rounded-t-2xl bg-background p-0 text-foreground backdrop:bg-[#2B2118]/50"
    >
      {open && (
        <div className="flex max-h-[88dvh] flex-col">
          <div className="overflow-y-auto px-6 pb-4 pt-3">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" aria-hidden="true" />
            <div className="flex items-center justify-between border-b-4 border-primary pb-3">
              <h2 id={titleId} className="font-serif text-[34px] font-bold leading-tight">Filtri</h2>
              <button type="button" onClick={onReset} className="min-h-11 px-2 text-base font-bold text-primary">Azzera</button>
            </div>
            {children}
          </div>
          <div className="border-t border-border bg-nav px-6 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-4">
            <button type="button" onClick={onApply} className="min-h-14 w-full rounded-[8px] bg-primary text-lg font-bold text-primary-foreground">
              Mostra {count} {count === 1 ? "risultato" : "risultati"}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

/** One filter group: buttons pressed for the chosen values ("o" inside the group). */
export function FilterGroup<T extends string>({ title, options, selected, onToggle, label = String, segmented = false }: {
  title: string;
  options: readonly T[];
  selected: readonly T[];
  onToggle: (value: T) => void;
  label?: (value: T) => string;
  segmented?: boolean;
}) {
  return (
    <fieldset className="mt-6">
      <legend className="mb-3 text-[13px] font-bold uppercase tracking-[0.12em] text-muted">{title}</legend>
      <div className={segmented ? "grid grid-flow-col auto-cols-fr gap-1 rounded-[8px] border border-border bg-elevated p-1" : "flex flex-wrap gap-2"}>
        {options.map(value => {
          const on = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(value)}
              className={segmented
                // Four choices (the Bestiario collections with Homebrew) stay whole on a 360 px phone.
                ? `min-h-11 min-w-0 rounded-[6px] font-bold ${options.length > 3 ? "px-0.5 text-[14px]" : "px-2 text-base"} ${on ? "bg-primary text-primary-foreground" : "text-foreground"}`
                : `min-h-11 rounded-[8px] border-2 px-4 text-base font-bold ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent text-foreground"}`}
            >
              {label(value)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
