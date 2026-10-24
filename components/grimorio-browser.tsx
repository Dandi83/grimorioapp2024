"use client";

import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FileText, Star } from "lucide-react";

import { useFavorites } from "@/components/favorites-provider";
import { spellName } from "@/lib/spell-name";
import { saveListState } from "@/components/navigation-memory";
import { HiddenTag } from "@/components/sections/hidden-tag";
import { useIntentPrefetch } from "@/components/use-intent-prefetch";
import { useRevealSelected } from "@/components/layout/use-reveal-selected";
import { useUserEdition } from "@/components/edition/edition-provider";
import { useEditions } from "@/components/sections/parts-context";
import { ActiveFilters, CatalogTitle, FilterGroup, FilterSheet, SearchAndFilters, type ActiveFilter } from "@/components/catalog-ui";
import { CASTING_TIMES, CASTING_TIME_LABEL, capitalizeWords, castingTimeGroup, type CastingTime, type SpellListItem, type SpellsMeta } from "@/lib/spells-types";

const PAGE_SIZE = 40;
export type SpellEdition = "2024" | "2014";

export type SpellFilters = { livello: number[]; scuola: string[]; classe: string[]; tempo: CastingTime[]; concentrazione: boolean; rituale: boolean };
export const NO_SPELL_FILTERS: SpellFilters = { livello: [], scuola: [], classe: [], tempo: [], concentrazione: false, rituale: false };
export type SpellListState = SpellFilters & { url: string; q: string; edizione: SpellEdition; limit: number; scroll: number };

const levelName = (n: number) => n < 0 ? "Altro" : n === 0 ? "Trucchetti" : `Livello ${n}`;

/** "o" inside the same filter, "e" between different filters. */
export function matchesSpellFilters(spell: SpellListItem, filters: SpellFilters): boolean {
  if (filters.livello.length && !filters.livello.includes(spell.livello_num)) return false;
  if (filters.scuola.length && !filters.scuola.some(s => s.toLowerCase() === spell.scuola.toLowerCase())) return false;
  if (filters.classe.length && !filters.classe.some(c => spell.classi.includes(c.toLowerCase()))) return false;
  if (filters.tempo.length && !filters.tempo.includes(castingTimeGroup(spell.tempo_di_lancio) as CastingTime)) return false;
  if (filters.concentrazione && !spell.concentrazione) return false;
  if (filters.rituale && !spell.rituale) return false;
  return true;
}

const toggle = <T,>(list: readonly T[], value: T, order: readonly T[]) =>
  list.includes(value) ? list.filter(item => item !== value) : order.filter(item => item === value || list.includes(item));

interface Props {
  spells: SpellListItem[];
  meta: SpellsMeta;
  initialFilters?: SpellFilters;
  initialEdizione?: SpellEdition;
  initialQuery?: string;
  initialLimit?: number;
  initialScroll?: number;
  /** The list column of the computer layout: the open card highlighted, no state saved for «back». */
  pane?: { selectedId?: string };
}

export function GrimorioBrowser({
  spells,
  meta,
  initialFilters = NO_SPELL_FILTERS,
  initialEdizione = "2024",
  initialQuery = "",
  initialLimit = PAGE_SIZE,
  initialScroll,
  pane,
}: Props) {
  const [q, setQ] = useState(initialQuery);
  const [filters, setFilters] = useState<SpellFilters>(initialFilters);
  const [draft, setDraft] = useState<SpellFilters | null>(null);
  // Until 2014 spells are in the catalog the 2014 list would be empty: no selector, 2024 only.
  const hasLegacy = useMemo(() => spells.some(spell => spell.edizione === "2014"), [spells]);
  const { choose: chooseUserEdition } = useUserEdition();
  const [chosenEdizione, setEdizione] = useState<SpellEdition>(initialEdizione);
  // An edition hidden from /admin/sezioni is never shown, even if it was the last one chosen.
  const { allowed } = useEditions("incantesimi");
  const edizione: SpellEdition = !hasLegacy ? "2024" : allowed.includes(chosenEdizione) ? chosenEdizione : allowed[0];
  const [limit, setLimit] = useState(initialLimit);
  const deferredQ = useDeferredValue(q);
  const { isFavorite, toggle: toggleFavorite } = useFavorites();

  const sorted = useMemo(() => {
    const rank = (n: number) => (n < 0 ? Number.POSITIVE_INFINITY : n);
    return spells
      .filter(spell => (spell.edizione === "2014") === (edizione === "2014"))
      .sort((a, b) => rank(a.livello_num) - rank(b.livello_num) || a.nome_italiano.localeCompare(b.nome_italiano, "it"));
  }, [spells, edizione]);
  const searched = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    return needle ? sorted.filter(s => s.nome_italiano.toLowerCase().includes(needle)) : sorted;
  }, [sorted, deferredQ]);
  const results = useMemo(() => searched.filter(s => matchesSpellFilters(s, filters)), [searched, filters]);
  const draftCount = useMemo(() => draft ? searched.filter(s => matchesSpellFilters(s, draft)).length : 0, [searched, draft]);
  const perLevel = useMemo(() => {
    const counts = new Map<number, number>();
    for (const spell of results) counts.set(spell.livello_num, (counts.get(spell.livello_num) ?? 0) + 1);
    return counts;
  }, [results]);

  // A new edition, search or filter starts again from the first page.
  const key = JSON.stringify([edizione, q, filters]);
  const lastKey = useRef(key);
  useEffect(() => {
    if (lastKey.current === key) return;
    lastKey.current = key;
    setLimit(PAGE_SIZE);
  }, [key]);
  const visible = results.slice(0, limit);

  // Computer column: a card opened from a direct link shows its row, in its edition and page.
  const selectedId = pane?.selectedId;
  const root = useRef<HTMLDivElement>(null);
  const shownFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!selectedId || shownFor.current === selectedId) return;
    const selected = spells.find(item => item.id === selectedId);
    if (!selected) return;
    const own: SpellEdition = selected.edizione === "2014" ? "2014" : "2024";
    if (own !== edizione && allowed.includes(own)) {
      setEdizione(own);
      setFilters(NO_SPELL_FILTERS);
      return;
    }
    shownFor.current = selectedId;
    const index = results.findIndex(item => item.id === selectedId);
    if (index >= limit) setLimit(Math.ceil((index + 1) / PAGE_SIZE) * PAGE_SIZE);
  }, [selectedId, spells, results, edizione, allowed, limit]);
  useRevealSelected(root, selectedId);

  // Remember the list for "back" from a card; the scroll is taken when a row is opened.
  const scroll = useRef(initialScroll ?? 0);
  const save = () => saveListState<SpellListState>("grimorio",
    { url: window.location.search, q, ...filters, edizione, limit, scroll: scroll.current });
  useEffect(() => { if (!pane) save(); });
  useEffect(() => {
    if (initialScroll) window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.scrollTo(0, initialScroll)));
  }, [initialScroll]);

  // The 2024 · 2014 buttons change «la tua edizione» for the whole app (and drop an edition of the address).
  const chooseEdition = (value: SpellEdition) => {
    if (value === edizione) return;
    setEdizione(value);
    setFilters(NO_SPELL_FILTERS);
    const url = new URL(window.location.href);
    if (!pane && url.searchParams.has("edizione")) {
      url.searchParams.delete("edizione");
      window.history.replaceState(window.history.state, "", url);
    }
    chooseUserEdition(value);
  };

  const active: ActiveFilter[] = [
    ...filters.livello.map(n => ({ key: `livello:${n}`, label: levelName(n), remove: () => setFilters(f => ({ ...f, livello: f.livello.filter(x => x !== n) })) })),
    ...filters.scuola.map(s => ({ key: `scuola:${s}`, label: s, remove: () => setFilters(f => ({ ...f, scuola: f.scuola.filter(x => x !== s) })) })),
    ...filters.classe.map(c => ({ key: `classe:${c}`, label: capitalizeWords(c), remove: () => setFilters(f => ({ ...f, classe: f.classe.filter(x => x !== c) })) })),
    ...filters.tempo.map(t => ({ key: `tempo:${t}`, label: CASTING_TIME_LABEL[t], remove: () => setFilters(f => ({ ...f, tempo: f.tempo.filter(x => x !== t) })) })),
    ...(filters.concentrazione ? [{ key: "concentrazione", label: "Concentrazione", remove: () => setFilters(f => ({ ...f, concentrazione: false })) }] : []),
    ...(filters.rituale ? [{ key: "rituale", label: "Rituale", remove: () => setFilters(f => ({ ...f, rituale: false })) }] : []),
  ];

  return (
    <div ref={root}>
      <div className="px-6 pb-2 pt-8">
        <CatalogTitle section="incantesimi" title="Incantesimi" edition={edizione} onEdition={hasLegacy ? chooseEdition : undefined} />
        <SearchAndFilters query={q} onQuery={setQ} label="Cerca un incantesimo" active={active.length} onOpen={() => setDraft(filters)} />
        <ActiveFilters filters={active} />
      </div>

      <FilterSheet
        open={draft !== null}
        onClose={() => setDraft(null)}
        onReset={() => setDraft(NO_SPELL_FILTERS)}
        onApply={() => { if (draft) setFilters(draft); setDraft(null); }}
        count={draftCount}
      >
        {draft && <>
          <FilterGroup title="Livello" options={meta.livelli.map(String)} selected={draft.livello.map(String)} label={n => levelName(Number(n))}
            onToggle={n => setDraft({ ...draft, livello: toggle(draft.livello, Number(n), meta.livelli) })} />
          <FilterGroup title="Scuola" options={meta.scuole} selected={draft.scuola}
            onToggle={s => setDraft({ ...draft, scuola: toggle(draft.scuola, s, meta.scuole) })} />
          <FilterGroup title="Classe" options={meta.classi} selected={draft.classe} label={capitalizeWords}
            onToggle={c => setDraft({ ...draft, classe: toggle(draft.classe, c, meta.classi) })} />
          <FilterGroup title="Tempo di lancio" options={CASTING_TIMES} selected={draft.tempo} label={t => CASTING_TIME_LABEL[t]}
            onToggle={t => setDraft({ ...draft, tempo: toggle(draft.tempo, t, CASTING_TIMES) })} />
          <FilterGroup title="Caratteristiche" options={["Concentrazione", "Rituale"] as const}
            selected={[...(draft.concentrazione ? ["Concentrazione" as const] : []), ...(draft.rituale ? ["Rituale" as const] : [])]}
            onToggle={value => setDraft(value === "Concentrazione" ? { ...draft, concentrazione: !draft.concentrazione } : { ...draft, rituale: !draft.rituale })} />
        </>}
      </FilterSheet>

      <p role="status" aria-live="polite" className="sr-only">{results.length} {results.length === 1 ? "risultato" : "risultati"}</p>
      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
          <FileText size={48} className="text-muted" aria-hidden="true" />
          <p className="font-serif text-lg italic text-muted">
            Nessun incantesimo trovato.
          </p>
        </div>
      ) : (
        <ul className="px-6 pb-2" onClickCapture={() => { if (pane) return; scroll.current = window.scrollY; save(); }}>
          {visible.map((spell, i) => {
            const prev = visible[i - 1];
            const newGroup = !prev || prev.livello_num !== spell.livello_num;
            const count = perLevel.get(spell.livello_num) ?? 0;
            return (
              <li key={spell.id} className={`catalog-row${newGroup ? (i > 0 ? " catalog-row-group" : " catalog-row-first-group") : ""}`}>
                {newGroup && (
                  <div className={`flex items-center gap-3 ${i > 0 ? "mt-6" : "mt-3"} mb-1`}>
                    <h2 className="font-serif text-[26px] font-bold text-primary">{levelName(spell.livello_num)}</h2>
                    <span className="h-px flex-1 bg-border" aria-hidden="true" />
                    <span className="text-[15px] text-muted">{count} {count === 1 ? "incantesimo" : "incantesimi"}</span>
                  </div>
                )}
                <GrimorioRow spell={spell} fav={isFavorite(spell.id)} onToggle={toggleFavorite} selected={pane?.selectedId === spell.id} />
              </li>
            );
          })}
        </ul>
      )}
      {visible.length < results.length && (
        <div className="px-6 pb-6 pt-2">
          <button
            type="button"
            onClick={() => setLimit(current => current + PAGE_SIZE)}
            className="min-h-12 w-full rounded-[8px] border border-border bg-elevated text-base font-bold text-foreground"
          >
            Mostra altri ({results.length - visible.length})
          </button>
        </div>
      )}
    </div>
  );
}

// Memoized: toggling one star re-renders only that row.
const GrimorioRow = memo(function GrimorioRow({ spell, fav, onToggle, selected = false }: { spell: SpellListItem; fav: boolean; onToggle: (id: string) => void; selected?: boolean }) {
  const href = `/spell/${spell.id}`;
  const prefetch = useIntentPrefetch(href);
  const details = [spell.scuola, spell.tempo_di_lancio].filter(Boolean).join(" · ");
  return (
    <div className={`flex min-h-[62px] items-center gap-2 border-b border-divider${selected ? " -mx-3 rounded-[10px] bg-primary-faint px-3 shadow-[inset_3px_0_0_var(--color-primary)]" : ""}`}>
      <Link href={href} prefetch={false} onTouchStart={prefetch} onMouseEnter={prefetch} aria-current={selected ? "page" : undefined} className="min-w-0 flex-1 py-2.5">
        <span className="block break-words font-serif text-[21px] font-bold leading-tight text-foreground">{spellName(spell.nome_italiano, spell.edizione)}{spell.nascosta && <> <HiddenTag /></>}</span>
        {details && <span className="block text-[15px] text-muted">{details}</span>}
        {(spell.concentrazione || spell.rituale) && (
          <span className="mt-1 flex flex-wrap gap-1.5">
            {spell.concentrazione && <span className="rounded-[6px] bg-amber px-2 py-0.5 text-[13px] font-bold text-foreground">Concentrazione</span>}
            {spell.rituale && <span className="rounded-[6px] bg-amber px-2 py-0.5 text-[13px] font-bold text-foreground">Rituale</span>}
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={() => onToggle(spell.id)}
        aria-label={fav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
        aria-pressed={fav}
        className="grid size-11 shrink-0 place-items-center transition-transform active:scale-90"
      >
        <Star size={24} strokeWidth={1.75} className={fav ? "fill-primary text-primary" : "text-primary"} />
      </button>
    </div>
  );
});
