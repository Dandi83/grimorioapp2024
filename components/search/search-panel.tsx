"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { HomebrewPill } from "@/components/homebrew-pill";
import { ChevronRight, Search } from "lucide-react";

import { HOMEBREW_LABEL, rowHref, rowsOf, search, type SearchIndex, type SearchMatch, type SearchSectionKey } from "@/lib/search";

export interface SearchPanelProps {
  initialQuery: string;
  initialSection?: string;
  onClose: () => void;
}

/** Examples under «Prova a scrivere…»: each one finds results in the data (tests/search.cjs). */
const EXAMPLES = ["drago", "fuoco", "spada", "avvelenato", "anello"];

let indexPromise: Promise<SearchIndex> | undefined;
// Fetched once, at the first opening; the service worker keeps a copy for offline use.
const loadIndex = () => (indexPromise ??= fetch("/ricerca-indice.json").then(response => {
  if (!response.ok) throw new Error(String(response.status));
  return response.json() as Promise<SearchIndex>;
}).catch(error => { indexPromise = undefined; throw error; }));

function readStored(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function Highlighted({ row, length }: { row: SearchMatch; length: number }) {
  return (
    <>
      {row.nome.slice(0, row.start)}
      <mark className="rounded-[3px] bg-[#F6E2A8] font-bold text-primary">{row.nome.slice(row.start, row.start + length)}</mark>
      {row.nome.slice(row.start + length)}
    </>
  );
}

/** Full-screen search: filters by section, results while typing, grouped by section. */
export function SearchPanel({ initialQuery, initialSection, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const [section, setSection] = useState<SearchSectionKey | undefined>(initialSection as SearchSectionKey | undefined);
  const [expanded, setExpanded] = useState<SearchSectionKey[]>([]);
  const [index, setIndex] = useState<SearchIndex>();
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);

  useEffect(() => {
    input.current?.focus();
    let alive = true;
    loadIndex().then(data => { if (alive) setIndex(data); }, () => { if (alive) setFailed(true); });
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") close.current(); };
    window.addEventListener("keydown", escape);
    document.body.style.overflow = "hidden";
    return () => { alive = false; window.removeEventListener("keydown", escape); document.body.style.overflow = ""; };
  }, []);

  // Text and filter stay in the address: "back" from a result comes here again.
  useEffect(() => {
    const params = new URLSearchParams({ cerca: query });
    if (section) params.set("sezione", section);
    window.history.replaceState(window.history.state, "", `/?${params}`);
  }, [query, section]);

  const rows = useMemo(() => (index ? rowsOf(index) : []), [index]);
  const editions = useMemo(() => new Map(index?.sections.map(item => [item.k, readStored(item.e)]) ?? []), [index]);
  const groups = useMemo(() => (index ? search(index, rows, query, { section, expanded }) : []), [index, rows, query, section, expanded]);
  const total = groups.reduce((sum, group) => sum + group.total, 0);
  const typed = query.trim().length;
  const choose = (value: string) => { setQuery(value); setExpanded([]); input.current?.focus(); };

  return (
    <div role="dialog" aria-modal="true" aria-label="Cerca in tutto il Grimorio" className="fixed inset-0 z-[70] flex flex-col bg-background">
      <div className="border-b-[1.5px] border-divider px-4 pb-2.5 pt-[calc(16px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5">
          <label className="flex min-h-[52px] min-w-0 flex-1 items-center gap-2.5 rounded-[26px] border-2 border-primary bg-card px-3.5">
            <Search size={22} strokeWidth={2.2} className="shrink-0 text-primary" aria-hidden="true" />
            <span className="sr-only">Cerca in tutto il Grimorio</span>
            <input ref={input} type="search" value={query} onChange={event => { setQuery(event.target.value); setExpanded([]); }}
              placeholder="Cerca in tutto il Grimorio…" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
              aria-controls="search-results" aria-describedby="search-count"
              className="h-12 min-w-0 flex-1 bg-transparent text-[17px] text-foreground outline-none placeholder:text-[#8a7a66]" />
          </label>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 px-1 text-[15px] font-bold text-primary">Annulla</button>
        </div>
        {index && (
          <div role="group" aria-label="Sezioni" className="no-scrollbar -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4">
            {[{ k: undefined, t: "Tutto" }, ...index.sections].map(item => {
              const on = section === item.k;
              return (
                <button key={item.t} type="button" aria-pressed={on} onClick={() => { setSection(item.k); setExpanded([]); }}
                  className={`min-h-11 shrink-0 whitespace-nowrap rounded-[22px] border-[1.5px] px-3.5 text-[15px] font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-chip-border bg-card text-primary"}`}>
                  {item.t}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div id="search-results" className="flex-1 overflow-y-auto px-4 pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-1.5">
        <div className="mx-auto max-w-2xl">
          <p id="search-count" role="status" aria-live="polite" className="sr-only">
            {typed && index ? (total ? `${total} ${total === 1 ? "risultato" : "risultati"}` : `Nessun risultato per «${query.trim()}»`) : ""}
          </p>
          {failed && <p className="py-8 text-center text-[15px] text-muted">La ricerca non è disponibile: manca la connessione e l’indice non è ancora salvato sul telefono.</p>}
          {!failed && !index && typed > 0 && <p className="py-8 text-center text-[15px] text-muted">Caricamento…</p>}
          {!typed && (
            <div className="pt-3.5">
              <p className="text-[15px] text-muted">Prova a scrivere…</p>
              <ul className="mt-2.5 flex flex-wrap gap-2" aria-label="Esempi">
                {EXAMPLES.map(example => (
                  <li key={example}>
                    <button type="button" onClick={() => choose(example)} className="min-h-11 rounded-[22px] bg-elevated px-4 text-[15px] text-muted">{example}</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {typed > 0 && index && !total && <p className="py-8 text-center text-[15px] text-muted">Nessun risultato per «{query.trim()}»</p>}
          {groups.map(group => (
            <section key={group.section} aria-labelledby={`gruppo-${group.section}`} className="pt-3.5">
              <div className="flex items-baseline justify-between px-0.5 pb-1.5">
                <h2 id={`gruppo-${group.section}`} className="font-serif text-[21px] font-bold text-primary">{group.title}</h2>
                <span className="text-[14px] text-muted">{group.total} {group.total === 1 ? "risultato" : "risultati"}</span>
              </div>
              <ul className="overflow-hidden rounded-[14px] border-[1.5px] border-border bg-card">
                {group.rows.map(row => (
                  <li key={row.href + row.nome} className="border-t border-divider first:border-t-0">
                    <Link href={rowHref(row, editions.get(row.section))} prefetch={false} className="flex min-h-[52px] items-center gap-2.5 px-3.5 py-1.5">
                      <span className="min-w-0 flex-1">
                        <span className="block text-base leading-tight text-foreground"><Highlighted row={row} length={query.trim().replace(/\s+/g, " ").length} /></span>
                        {row.label.startsWith(`${HOMEBREW_LABEL} · `)
                          ? <span className="flex flex-wrap items-center gap-1.5 text-[14px] text-muted"><HomebrewPill />{row.label.slice(HOMEBREW_LABEL.length + 3)}</span>
                          : <span className="block text-[14px] text-muted">{row.label}</span>}
                      </span>
                      <ChevronRight size={16} strokeWidth={2.4} className="shrink-0 text-[#B9A57C]" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
              {group.rows.length < group.total && (
                <button type="button" onClick={() => setExpanded(list => [...list, group.section])}
                  className="mt-1.5 min-h-11 px-1 text-[15px] font-bold text-primary">
                  Mostra tutti ({group.total})
                </button>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
