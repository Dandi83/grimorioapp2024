"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, FileText, Search, X } from "lucide-react";

import { SpellRow } from "@/components/spell-row";
import { useFavorites } from "@/components/favorites-provider";
import { saveListState } from "@/components/navigation-memory";
import {
  capitalizeWords,
  levelLabel,
  type SpellListItem,
  type SpellsMeta,
} from "@/lib/spells-types";

type FilterKind = "livello" | "scuola" | "classe" | null;
const PAGE_SIZE = 40;

export type SpellListState = {
  url: string; q: string; livello: number | null; scuola: string | null; classe: string | null; limit: number; scroll: number;
};

interface Props {
  spells: SpellListItem[];
  meta: SpellsMeta;
  initialLivello: number | null;
  initialScuola: string | null;
  initialClasse: string | null;
  initialQuery?: string;
  initialLimit?: number;
  initialScroll?: number;
}

export function GrimorioBrowser({
  spells,
  meta,
  initialLivello,
  initialScuola,
  initialClasse,
  initialQuery = "",
  initialLimit = PAGE_SIZE,
  initialScroll,
}: Props) {
  const [q, setQ] = useState(initialQuery);
  const [livello, setLivello] = useState<number | null>(initialLivello);
  const [scuola, setScuola] = useState<string | null>(initialScuola);
  const [classe, setClasse] = useState<string | null>(initialClasse);
  const [openFilter, setOpenFilter] = useState<FilterKind>(null);
  const [limit, setLimit] = useState(initialLimit);
  const deferredQ = useDeferredValue(q);
  const { isFavorite, toggle } = useFavorites();

  const sortedSpells = useMemo(() => {
    const rank = (n: number) => (n < 0 ? Number.POSITIVE_INFINITY : n);
    return [...spells].sort((a, b) =>
      rank(a.livello_num) - rank(b.livello_num) ||
      a.nome_italiano.localeCompare(b.nome_italiano, "it"),
    );
  }, [spells]);

  const results = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    return sortedSpells.filter((s) => {
      if (needle && !s.nome_italiano.toLowerCase().includes(needle)) return false;
      if (livello !== null && s.livello_num !== livello) return false;
      if (scuola && s.scuola.toLowerCase() !== scuola.toLowerCase()) return false;
      if (classe && !s.classi.includes(classe.toLowerCase())) return false;
      return true;
    });

  }, [sortedSpells, deferredQ, livello, scuola, classe]);

  // A new search or filter starts again from the first page.
  const filters = JSON.stringify([q, livello, scuola, classe]);
  const lastFilters = useRef(filters);
  useEffect(() => {
    if (lastFilters.current === filters) return;
    lastFilters.current = filters;
    setLimit(PAGE_SIZE);
  }, [filters]);
  const visible = results.slice(0, limit);

  // Remember the list for "back" from a card; the scroll is taken when a row is opened.
  const scroll = useRef(initialScroll ?? 0);
  const save = () => saveListState<SpellListState>("grimorio",
    { url: window.location.search, q, livello, scuola, classe, limit, scroll: scroll.current });
  useEffect(save);
  useEffect(() => {
    if (initialScroll) window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.scrollTo(0, initialScroll)));
  }, [initialScroll]);

  const activeCount =
    (livello !== null ? 1 : 0) + (scuola ? 1 : 0) + (classe ? 1 : 0);

  const clearFilters = () => {
    setLivello(null);
    setScuola(null);
    setClasse(null);
    setOpenFilter(null);
  };

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background px-6 pb-3 pt-6">
        <h1 className="mb-4 font-serif text-3xl font-bold text-foreground">
          Incantesimi ({spells.length})
        </h1>

        {/* Search */}
        <div className="flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-3">
          <Search size={18} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca incantesimo..."
            autoCorrect="off"
            autoCapitalize="none"
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted"
          />
          {q.length > 0 && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Cancella ricerca"
            >
              <X size={18} className="text-muted" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          <Chip
            label={livello !== null ? levelLabel(livello) : "Livello"}
            active={livello !== null}
            caret
            onClick={() =>
              setOpenFilter(openFilter === "livello" ? null : "livello")
            }
          />
          <Chip
            label={scuola ?? "Scuola"}
            active={!!scuola}
            caret
            onClick={() =>
              setOpenFilter(openFilter === "scuola" ? null : "scuola")
            }
          />
          <Chip
            label={classe ? capitalizeWords(classe) : "Classe"}
            active={!!classe}
            caret
            onClick={() =>
              setOpenFilter(openFilter === "classe" ? null : "classe")
            }
          />
          {activeCount > 0 && (
            <Chip label="Pulisci" active destructive onClick={clearFilters} />
          )}
        </div>

        {/* Expanded options */}
        {openFilter && (
          <div className="no-scrollbar -mx-6 mt-2 flex gap-2 overflow-x-auto border-t border-divider bg-card px-6 py-3">
            {openFilter === "livello" &&
              meta.livelli.map((n) => (
                <Option
                  key={n}
                  label={levelLabel(n)}
                  active={livello === n}
                  onClick={() => {
                    setLivello(livello === n ? null : n);
                    setOpenFilter(null);
                  }}
                />
              ))}
            {openFilter === "scuola" &&
              meta.scuole.map((s) => (
                <Option
                  key={s}
                  label={s}
                  active={scuola === s}
                  onClick={() => {
                    setScuola(scuola === s ? null : s);
                    setOpenFilter(null);
                  }}
                />
              ))}
            {openFilter === "classe" &&
              meta.classi.map((c) => (
                <Option
                  key={c}
                  label={capitalizeWords(c)}
                  active={classe === c}
                  onClick={() => {
                    setClasse(classe === c ? null : c);
                    setOpenFilter(null);
                  }}
                />
              ))}
          </div>
        )}
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
          <FileText size={48} className="text-muted" />
          <p className="font-serif text-base italic text-muted">
            Nessun incantesimo trovato.
          </p>
        </div>
      ) : (
        <>
        <ul className="px-6 py-2" onClickCapture={() => { scroll.current = window.scrollY; save(); }}>
          {visible.map((spell, i) => {
            const prev = visible[i - 1];
            const newGroup = !prev || prev.livello_num !== spell.livello_num;
            return (
              <li key={spell.id} className={`catalog-row${newGroup ? (i > 0 ? " catalog-row-group" : " catalog-row-first-group") : ""}`}>
                {newGroup ? (
                  <div
                    className={`flex items-center gap-3 ${i > 0 ? "mt-6" : "mt-1"} mb-1`}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                      {spell.livello_num < 0
                        ? "Altro"
                        : spell.livello_num === 0
                          ? "Trucchetti"
                          : `${spell.livello_num}° livello`}
                    </span>
                    <span className="h-px flex-1 bg-divider" />
                  </div>
                ) : (
                  <div className="ml-[15px] h-px bg-divider" />
                )}
                <SpellRow spell={spell} fav={isFavorite(spell.id)} onToggle={toggle} />
              </li>
            );
          })}
        </ul>
        {visible.length < results.length && (
          <div className="px-6 pb-6 pt-2">
            <button
              type="button"
              onClick={() => setLimit(current => current + PAGE_SIZE)}
              className="h-12 w-full rounded-xl border border-border bg-card text-sm font-semibold text-card-foreground"
            >
              Mostra altri ({results.length - visible.length})
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
}

function Chip({
  label,
  active,
  caret,
  destructive,
  onClick,
}: {
  label: string;
  active: boolean;
  caret?: boolean;
  destructive?: boolean;
  onClick: () => void;
}) {
  const base =
    "flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-colors";
  const cls = destructive
    ? "border-destructive bg-card text-destructive-foreground"
    : active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-card-foreground";
  return (
    <button type="button" onClick={onClick} className={`${base} ${cls}`}>
      {label}
      {caret && <ChevronDown size={14} />}
    </button>
  );
}

function Option({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 rounded-xl border px-4 py-2 text-[13px] font-semibold transition-colors ${
        active
          ? "border-primary bg-primary-faint text-primary"
          : "border-border bg-elevated text-card-foreground"
      }`}
    >
      {label}
    </button>
  );
}
