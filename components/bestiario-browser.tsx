"use client";

import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Skull, Star } from "lucide-react";

import { useFavorites } from "@/components/favorites-provider";
import { saveListState } from "@/components/navigation-memory";
import { useIntentPrefetch } from "@/components/use-intent-prefetch";
import { ActiveFilters, CatalogTitle, FilterGroup, FilterSheet, SearchAndFilters, type ActiveFilter } from "@/components/catalog-ui";
import { computeMonstersMeta, isSrdAnimal, typeCategory, type MonsterListItem } from "@/lib/monsters-types";
import { HABITATS, matchesHabitats } from "@/lib/habitats";

export type Edition = "2024" | "2014";
/** The last edition chosen on this phone or browser. */
export const EDITION_KEY = "grimorio.bestiario.edizione";
const PAGE_SIZE = 40;

export type Category = "tutti" | "mostri" | "animali";
const CATEGORIES: readonly Category[] = ["tutti", "mostri", "animali"];
const CATEGORY_LABEL: Record<Category, string> = { tutti: "Tutti", mostri: "Mostri", animali: "Animali" };

/** Challenge-rating bands of the filter panel; several can be chosen. */
export const GS_BANDS = ["0-1", "2-4", "5-10", "11-16", "17+"] as const;
export type GsBand = (typeof GS_BANDS)[number];
const BAND_LABEL: Record<GsBand, string> = { "0-1": "0 – 1", "2-4": "2 – 4", "5-10": "5 – 10", "11-16": "11 – 16", "17+": "17+" };
export function gsBand(gsNum: number): GsBand {
  return gsNum <= 1 ? "0-1" : gsNum <= 4 ? "2-4" : gsNum <= 10 ? "5-10" : gsNum <= 16 ? "11-16" : "17+";
}

export type MonsterFilters = { categoria: Category; gs: GsBand[]; tipo: string[]; taglia: string[]; habitat: string[] };
export const NO_FILTERS: MonsterFilters = { categoria: "tutti", gs: [], tipo: [], taglia: [], habitat: [] };

export type MonsterListState = MonsterFilters & { url: string; q: string; edizione: Edition; limit: number; scroll: number };

/** "o" inside the same filter, "e" between different filters. */
export function matchesFilters(monster: MonsterListItem, filters: MonsterFilters): boolean {
  if (filters.categoria !== "tutti" && (filters.categoria === "animali") !== isSrdAnimal(monster)) return false;
  if (filters.gs.length && !filters.gs.includes(gsBand(monster.gs_num))) return false;
  if (filters.tipo.length && !filters.tipo.includes(typeCategory(monster.tipo))) return false;
  if (filters.taglia.length && !filters.taglia.includes(monster.taglia)) return false;
  return matchesHabitats(monster.habitat, filters.habitat);
}

const toggle = <T,>(list: readonly T[], value: T, order: readonly T[]) =>
  list.includes(value) ? list.filter(item => item !== value) : order.filter(item => item === value || list.includes(item));

interface Props {
  monsters: MonsterListItem[];
  initialFilters?: MonsterFilters;
  initialEdizione?: Edition;
  initialQuery?: string;
  initialLimit?: number;
  initialScroll?: number;
}

export function BestiarioBrowser({
  monsters,
  initialFilters = NO_FILTERS,
  initialEdizione = "2024",
  initialQuery = "",
  initialLimit = PAGE_SIZE,
  initialScroll,
}: Props) {
  const [q, setQ] = useState(initialQuery);
  const [filters, setFilters] = useState<MonsterFilters>(initialFilters);
  const [draft, setDraft] = useState<MonsterFilters | null>(null);
  const [edizione, setEdizione] = useState<Edition>(initialEdizione);
  const [limit, setLimit] = useState(initialLimit);
  const deferredQ = useDeferredValue(q);
  const { isFavorite, toggle: toggleFavorite } = useFavorites();

  const editionMonsters = useMemo(() => monsters.filter(monster => monster.edizione === edizione), [monsters, edizione]);
  const meta = useMemo(() => computeMonstersMeta(editionMonsters), [editionMonsters]);
  const searched = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    return needle ? editionMonsters.filter(m => m.nome.toLowerCase().includes(needle)) : editionMonsters;
  }, [editionMonsters, deferredQ]);

  const results = useMemo(() => searched.filter(m => matchesFilters(m, filters))
    // By challenge rating, then by name.
    .sort((a, b) => a.gs_num - b.gs_num || a.nome.localeCompare(b.nome, "it")), [searched, filters]);
  const draftCount = useMemo(() => draft ? searched.filter(m => matchesFilters(m, draft)).length : 0, [searched, draft]);

  // A new edition, search or filter starts again from the first page.
  const key = JSON.stringify([edizione, q, filters]);
  const lastKey = useRef(key);
  useEffect(() => {
    if (lastKey.current === key) return;
    lastKey.current = key;
    setLimit(PAGE_SIZE);
  }, [key]);
  const visible = results.slice(0, limit);

  // Remember the list for "back" from a card; the scroll is taken when a row is opened.
  const scroll = useRef(initialScroll ?? 0);
  const save = () => saveListState<MonsterListState>("bestiario",
    { url: window.location.search, q, ...filters, edizione, limit, scroll: scroll.current });
  useEffect(save);
  useEffect(() => {
    if (initialScroll) window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.scrollTo(0, initialScroll)));
  }, [initialScroll]);

  const chooseEdition = (value: Edition) => {
    if (value === edizione) return;
    setEdizione(value);
    // Types and sizes differ between editions: start again without filters.
    setFilters(NO_FILTERS);
    try {
      window.localStorage.setItem(EDITION_KEY, value);
    } catch {
      // the choice simply is not remembered
    }
  };

  const active: ActiveFilter[] = [
    ...(filters.categoria !== "tutti" ? [{ key: "categoria", label: CATEGORY_LABEL[filters.categoria], remove: () => setFilters(f => ({ ...f, categoria: "tutti" as const })) }] : []),
    ...filters.gs.map(band => ({ key: `gs:${band}`, label: `GS ${BAND_LABEL[band]}`, remove: () => setFilters(f => ({ ...f, gs: f.gs.filter(x => x !== band) })) })),
    ...filters.tipo.map(tipo => ({ key: `tipo:${tipo}`, label: tipo, remove: () => setFilters(f => ({ ...f, tipo: f.tipo.filter(x => x !== tipo) })) })),
    ...filters.taglia.map(taglia => ({ key: `taglia:${taglia}`, label: taglia, remove: () => setFilters(f => ({ ...f, taglia: f.taglia.filter(x => x !== taglia) })) })),
    ...filters.habitat.map(habitat => ({ key: `habitat:${habitat}`, label: habitat, remove: () => setFilters(f => ({ ...f, habitat: f.habitat.filter(x => x !== habitat) })) })),
  ];

  return (
    <div>
      <div className="px-6 pb-2 pt-8">
        <CatalogTitle title="Bestiario" edition={edizione} onEdition={chooseEdition} />
        <SearchAndFilters query={q} onQuery={setQ} label="Cerca una creatura" active={active.length} onOpen={() => setDraft(filters)} />
        <ActiveFilters filters={active} />
      </div>

      <FilterSheet
        open={draft !== null}
        onClose={() => setDraft(null)}
        onReset={() => setDraft(NO_FILTERS)}
        onApply={() => { if (draft) setFilters(draft); setDraft(null); }}
        count={draftCount}
      >
        {draft && <>
          <FilterGroup title="Categoria" segmented options={CATEGORIES} selected={[draft.categoria]} label={c => CATEGORY_LABEL[c]}
            onToggle={categoria => setDraft({ ...draft, categoria })} />
          <FilterGroup title="Grado sfida" options={GS_BANDS} selected={draft.gs} label={band => BAND_LABEL[band]}
            onToggle={band => setDraft({ ...draft, gs: toggle(draft.gs, band, GS_BANDS) })} />
          <FilterGroup title="Tipo" options={meta.tipi} selected={draft.tipo}
            onToggle={tipo => setDraft({ ...draft, tipo: toggle(draft.tipo, tipo, meta.tipi) })} />
          <FilterGroup title="Taglia" options={meta.taglie} selected={draft.taglia}
            onToggle={taglia => setDraft({ ...draft, taglia: toggle(draft.taglia, taglia, meta.taglie) })} />
          <FilterGroup title="Habitat" options={HABITATS} selected={draft.habitat}
            onToggle={habitat => setDraft({ ...draft, habitat: toggle(draft.habitat, habitat, HABITATS) })} />
        </>}
      </FilterSheet>

      <div className="px-6">
        <div className="grid grid-cols-[minmax(0,1.3fr)_48px_minmax(0,0.8fr)_44px] items-end gap-2 border-b-2 border-border-strong pb-2 pt-4 text-[12px] font-bold uppercase tracking-[0.06em] text-muted">
          <span role="status" className="whitespace-nowrap" aria-live="polite">Nome · {results.length} {results.length === 1 ? "risultato" : "risultati"}</span>
          <span>GS</span>
          <span>Tipo</span>
          <span />
        </div>
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <Skull size={48} className="text-muted" aria-hidden="true" />
            <p className="font-serif text-lg italic text-muted">Nessuna creatura trovata.</p>
          </div>
        ) : (
          <ul onClickCapture={() => { scroll.current = window.scrollY; save(); }}>
            {visible.map(monster => (
              <li key={monster.id} className="catalog-row border-b border-divider">
                <BestiaryRow monster={monster} fav={isFavorite(`mostro:${monster.id}`)} onToggle={toggleFavorite} />
              </li>
            ))}
          </ul>
        )}
      </div>
      {visible.length < results.length && (
        <div className="px-6 pb-6 pt-4">
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
const BestiaryRow = memo(function BestiaryRow({ monster, fav, onToggle }: { monster: MonsterListItem; fav: boolean; onToggle: (id: string) => void }) {
  const favId = `mostro:${monster.id}`;
  const href = `/mostro/${monster.id}`;
  const prefetch = useIntentPrefetch(href);
  return (
    <div className="grid min-h-[62px] grid-cols-[minmax(0,1.3fr)_48px_minmax(0,0.8fr)_44px] items-center gap-2">
      <Link
        href={href}
        prefetch={false}
        onTouchStart={prefetch}
        onMouseEnter={prefetch}
        className="col-span-3 grid min-w-0 grid-cols-subgrid items-center py-2.5"
      >
        <span className="min-w-0">
          <span className="block break-words font-serif text-[21px] font-bold leading-tight text-foreground">{monster.nome}</span>
          <span className="block truncate text-[15px] text-muted">{monster.taglia}</span>
        </span>
        <span className="font-serif text-[21px] font-bold tabular-nums text-primary">{monster.grado_sfida || "—"}</span>
        <span className="truncate text-base text-foreground">{typeCategory(monster.tipo)}</span>
      </Link>
      <button
        type="button"
        onClick={() => onToggle(favId)}
        aria-label={fav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
        aria-pressed={fav}
        className="grid size-11 place-items-center transition-transform active:scale-90"
      >
        <Star size={24} strokeWidth={1.75} className={fav ? "fill-primary text-primary" : "text-primary"} />
      </button>
    </div>
  );
});
