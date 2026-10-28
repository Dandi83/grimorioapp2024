"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FlaskConical, Skull, Star } from "lucide-react";

import { useFavorites } from "@/components/favorites-provider";
import { saveListState } from "@/components/navigation-memory";
import { HiddenTag } from "@/components/sections/hidden-tag";
import { NoSrdMark, useNoSrd } from "@/components/admin-edit/no-srd-mark";
import { ProvenanceGroup, useProvenanceFilter } from "@/components/admin-edit/provenance-filter";
import { PROVENANCE_LABEL, matchesProvenance } from "@/lib/provenance";
import { useIntentPrefetch } from "@/components/use-intent-prefetch";
import { useRevealSelected } from "@/components/layout/use-reveal-selected";
import { useUserEdition } from "@/components/edition/edition-provider";
import { useFollowEdition } from "@/components/edition/use-follow-edition";
import { SoonEntry, useEditions, usePart } from "@/components/sections/parts-context";
import { ActiveFilters, CatalogTitle, FilterGroup, FilterSheet, SearchAndFilters, type ActiveFilter } from "@/components/catalog-ui";
import { collectionOf, computeMonstersMeta, isSrdAnimal, typeCategory, type MonsterListItem } from "@/lib/monsters-types";
import { BothEditionsPill, HomebrewPill } from "@/components/homebrew-pill";
import { authorLine } from "@/lib/homebrew-types";
import { HABITATS, matchesHabitats } from "@/lib/habitats";
import { useReportSearch } from "@/components/statistics/use-report-search";
import { searchList } from "@/lib/fuzzy-search";
import { DidYouMean, SimilarResultsHeading, usePreparedNames } from "@/components/search/did-you-mean";

export type Edition = "2024" | "2014";
const PAGE_SIZE = 40;

export type Category = "tutti" | "mostri" | "animali" | "homebrew";
const CATEGORIES: readonly Category[] = ["tutti", "mostri", "animali", "homebrew"];
const CATEGORY_LABEL: Record<Category, string> = { tutti: "Tutti", mostri: "Mostri", animali: "Animali", homebrew: "Homebrew" };

/** Challenge-rating bands of the filter panel; several can be chosen. */
export const GS_BANDS = ["0-1", "2-4", "5-10", "11-16", "17+"] as const;
export type GsBand = (typeof GS_BANDS)[number];
const BAND_LABEL: Record<GsBand, string> = { "0-1": "0 – 1", "2-4": "2 – 4", "5-10": "5 – 10", "11-16": "11 – 16", "17+": "17+" };
export function gsBand(gsNum: number): GsBand {
  return gsNum <= 1 ? "0-1" : gsNum <= 4 ? "2-4" : gsNum <= 10 ? "5-10" : gsNum <= 16 ? "11-16" : "17+";
}

export type MonsterFilters = { categoria: Category; gs: GsBand[]; tipo: string[]; taglia: string[]; habitat: string[] };
const NO_FILTERS: MonsterFilters = { categoria: "tutti", gs: [], tipo: [], taglia: [], habitat: [] };

export type MonsterListState = MonsterFilters & { url: string; q: string; edizione: Edition; limit: number; scroll: number };

/**
 * "o" inside the same filter, "e" between different filters. Homebrew creatures are only in their own
 * collection («Homebrew»): «Tutti», «Mostri» and «Animali» stay the SRD catalog.
 */
function matchesFilters(monster: MonsterListItem, filters: MonsterFilters): boolean {
  if ((filters.categoria === "homebrew") !== !!monster.homebrew) return false;
  if (filters.categoria !== "tutti" && filters.categoria !== "homebrew" && (filters.categoria === "animali") !== isSrdAnimal(monster)) return false;
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
  /** The edition to show from now on (the address, else «la tua edizione»), followed without rebuilding the list. */
  edizione?: Edition;
  /** «La tua edizione» has been read from the device. */
  editionReady?: boolean;
  initialQuery?: string;
  initialLimit?: number;
  initialScroll?: number;
  /** The list column of the computer layout: GS badge on the left, the open card highlighted, no state saved for «back». */
  pane?: { selectedId?: string };
}

export function BestiarioBrowser({
  monsters,
  initialFilters = NO_FILTERS,
  initialEdizione = "2024",
  edizione: targetEdizione,
  editionReady = false,
  initialQuery = "",
  initialLimit = PAGE_SIZE,
  initialScroll,
  pane,
}: Props) {
  const [q, setQ] = useState(initialQuery);
  const [filters, setFilters] = useState<MonsterFilters>(initialFilters);
  const [draft, setDraft] = useState<MonsterFilters | null>(null);
  const { choose: chooseUserEdition } = useUserEdition();
  const [chosenEdizione, setEdizione] = useState<Edition>(initialEdizione);
  useFollowEdition(targetEdizione, editionReady, setEdizione, () => setFilters(NO_FILTERS));
  // Editions and collections hidden from /admin/sezioni: never shown to the public, labelled for the administrator.
  const { allowed } = useEditions("bestiario");
  const edizione: Edition = allowed.includes(chosenEdizione) ? chosenEdizione : allowed[0];
  const monstersPart = usePart("bestiario", "mostri"), animalsPart = usePart("bestiario", "animali"), homebrewPart = usePart("bestiario", "homebrew");
  const parts = { mostri: monstersPart, animali: animalsPart, homebrew: homebrewPart };
  const categoryLabel = (c: Category) => `${CATEGORY_LABEL[c]}${c !== "tutti" && parts[c].hidden ? (parts[c].soon ? " · In arrivo" : " · Nascosta") : ""}`;
  // Collections «In arrivo» for the public: an entry to the «in costruzione» page, never their creatures.
  const soonCollections = CATEGORIES.filter(c => c !== "tutti" && !parts[c].shown && parts[c].soon);
  // A homebrew «Entrambe» is in both editions.
  const collectionShown = (monster: MonsterListItem) => parts[collectionOf(monster)].shown;
  const [limit, setLimit] = useState(initialLimit);
  const deferredQ = useDeferredValue(q);
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  // The administrator only: «*» after the NO SRD cards, asked after the session check (never in the page).
  const noSrdView = useNoSrd("mostri");
  const noSrd = noSrdView?.ids ?? null;
  // The administrator only: «Provenienza» in the filters, from the same data as the «*».
  const origin = useProvenanceFilter(noSrdView?.provenance ?? null);
  const { ids: originIds, value: originValue, draft: originDraft } = origin;

  const editionMonsters = useMemo(() => monsters.filter(monster => (monster.edizione === edizione || monster.entrambe)
    && collectionShown(monster)), [monsters, edizione, animalsPart.shown, monstersPart.shown, homebrewPart.shown]); // eslint-disable-line react-hooks/exhaustive-deps
  // «Homebrew» only while the chosen edition has at least one published homebrew creature: never an empty filter.
  const hasHomebrew = editionMonsters.some(monster => monster.homebrew);
  const categories = CATEGORIES.filter(c => c === "tutti" || (parts[c].shown && (c !== "homebrew" || hasHomebrew)));
  const meta = useMemo(() => computeMonstersMeta(editionMonsters), [editionMonsters]);
  // By challenge rating, then by name.
  const byChallenge = useMemo(() => [...editionMonsters].sort((a, b) => a.gs_num - b.gs_num || a.nome.localeCompare(b.nome, "it")), [editionMonsters]);
  usePreparedNames(() => byChallenge.map(m => m.nome), byChallenge);
  // Accents, capitals and typos ignored (lib/fuzzy-search.ts): exact, starts with, contains (each by challenge), then
  // the approximate ones under «Risultati simili».
  const found = useMemo(() => searchList(byChallenge, deferredQ, m => m.nome), [byChallenge, deferredQ]);
  const searched = useMemo(() => [...found.exact, ...found.approximate], [found]);
  // The searched name and how many creatures of the edition have it exactly (statistics, only with the consent).
  useReportSearch(deferredQ, found.exact.length);

  const matches = useCallback((m: MonsterListItem) => matchesFilters(m, filters) && (!originIds || matchesProvenance(m, originValue, originIds)), [filters, originIds, originValue]);
  const results = useMemo(() => searched.filter(matches), [searched, matches]);
  const approximateFrom = useMemo(() => found.exact.filter(matches).length, [found, matches]);
  const suggestion = found.suggestion && matches(found.suggestion) ? found.suggestion.nome : null;
  const draftCount = useMemo(() => draft ? searched.filter(m => matchesFilters(m, draft) && (!originIds || matchesProvenance(m, originDraft, originIds))).length : 0, [searched, draft, originIds, originDraft]);

  // A new edition, search or filter starts again from the first page.
  const key = JSON.stringify([edizione, q, filters, originValue]);
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
    const selected = monsters.find(item => item.id === selectedId);
    if (!selected) return;
    if (selected.edizione !== edizione && allowed.includes(selected.edizione)) {
      setEdizione(selected.edizione);
      setFilters(NO_FILTERS);
      return;
    }
    shownFor.current = selectedId;
    const index = results.findIndex(item => item.id === selectedId);
    if (index >= limit) setLimit(Math.ceil((index + 1) / PAGE_SIZE) * PAGE_SIZE);
  }, [selectedId, monsters, results, edizione, allowed, limit]);
  useRevealSelected(root, selectedId);

  // Remember the list for "back" from a card; the scroll is taken when a row is opened.
  const scroll = useRef(initialScroll ?? 0);
  const save = () => saveListState<MonsterListState>("bestiario",
    { url: window.location.search, q, ...filters, edizione, limit, scroll: scroll.current });
  useEffect(() => { if (!pane) save(); });
  useEffect(() => {
    if (initialScroll) window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.scrollTo(0, initialScroll)));
  }, [initialScroll]);

  // The 2024 · 2014 buttons change «la tua edizione» for the whole app (and drop an edition of the address).
  const chooseEdition = (value: Edition) => {
    if (value === edizione) return;
    setEdizione(value);
    // Types and sizes differ between editions: start again without filters.
    setFilters(NO_FILTERS);
    const url = new URL(window.location.href);
    if (!pane && url.searchParams.has("edizione")) {
      url.searchParams.delete("edizione");
      window.history.replaceState(window.history.state, "", url);
    }
    chooseUserEdition(value);
  };

  const active: ActiveFilter[] = [
    ...(filters.categoria !== "tutti" ? [{ key: "categoria", label: CATEGORY_LABEL[filters.categoria], remove: () => setFilters(f => ({ ...f, categoria: "tutti" as const })) }] : []),
    ...filters.gs.map(band => ({ key: `gs:${band}`, label: `GS ${BAND_LABEL[band]}`, remove: () => setFilters(f => ({ ...f, gs: f.gs.filter(x => x !== band) })) })),
    ...filters.tipo.map(tipo => ({ key: `tipo:${tipo}`, label: tipo, remove: () => setFilters(f => ({ ...f, tipo: f.tipo.filter(x => x !== tipo) })) })),
    ...filters.taglia.map(taglia => ({ key: `taglia:${taglia}`, label: taglia, remove: () => setFilters(f => ({ ...f, taglia: f.taglia.filter(x => x !== taglia) })) })),
    ...filters.habitat.map(habitat => ({ key: `habitat:${habitat}`, label: habitat, remove: () => setFilters(f => ({ ...f, habitat: f.habitat.filter(x => x !== habitat) })) })),
    ...(originValue !== "tutte" ? [{ key: "provenienza", label: PROVENANCE_LABEL[originValue], remove: () => origin.setValue("tutte") }] : []),
  ];

  return (
    <div ref={root}>
      <div className="px-6 pb-2 pt-8">
        <CatalogTitle section="bestiario" title="Bestiario" edition={edizione} onEdition={chooseEdition} />
        <SearchAndFilters query={q} onQuery={setQ} label="Cerca una creatura"
          placeholder={pane ? "Cerca…" : undefined} active={active.length} onOpen={() => { setDraft(filters); origin.setDraft(originValue); }} />
        <ActiveFilters filters={active} />
      </div>

      <FilterSheet
        open={draft !== null}
        onClose={() => setDraft(null)}
        onReset={() => { setDraft(NO_FILTERS); origin.setDraft("tutte"); }}
        onApply={() => { if (draft) setFilters(draft); origin.setValue(originDraft); setDraft(null); }}
        count={draftCount}
      >
        {draft && <>
          {categories.length > 2 && <div data-part="bestiario:mostri"><div data-part="bestiario:animali"><div data-part="bestiario:homebrew"><FilterGroup title="Categoria" segmented options={categories} selected={[draft.categoria]} label={categoryLabel}
            onToggle={categoria => setDraft({ ...draft, categoria })} /></div></div></div>}
          {soonCollections.length > 0 && <div className="mb-5 flex flex-wrap gap-2">
            {soonCollections.map(c => <SoonEntry key={c} id={`bestiario:${c}`} className="inline-flex min-h-11 items-center rounded-full border border-dashed border-[#C9B48A] bg-[#FBF6EA] px-4 text-[15px] font-semibold text-muted">{CATEGORY_LABEL[c]}</SoonEntry>)}
          </div>}
          <FilterGroup title="Grado sfida" options={GS_BANDS} selected={draft.gs} label={band => BAND_LABEL[band]}
            onToggle={band => setDraft({ ...draft, gs: toggle(draft.gs, band, GS_BANDS) })} />
          <FilterGroup title="Tipo" options={meta.tipi} selected={draft.tipo}
            onToggle={tipo => setDraft({ ...draft, tipo: toggle(draft.tipo, tipo, meta.tipi) })} />
          <FilterGroup title="Taglia" options={meta.taglie} selected={draft.taglia}
            onToggle={taglia => setDraft({ ...draft, taglia: toggle(draft.taglia, taglia, meta.taglie) })} />
          <FilterGroup title="Habitat" options={HABITATS} selected={draft.habitat}
            onToggle={habitat => setDraft({ ...draft, habitat: toggle(draft.habitat, habitat, HABITATS) })} />
          {originIds && <ProvenanceGroup value={originDraft} onChange={origin.setDraft} />}
        </>}
      </FilterSheet>

      {filters.categoria === "homebrew" && <HomebrewIntro />}
      <div className="px-6">
        <div className={`${pane ? "flex" : "grid grid-cols-[minmax(0,1.3fr)_48px_minmax(0,0.8fr)_44px]"} items-end gap-2 border-b-2 border-border-strong pb-2 pt-4 text-[12px] font-bold uppercase tracking-[0.06em] text-muted`}>
          <span role="status" className="whitespace-nowrap" aria-live="polite">{pane ? "" : "Nome · "}{results.length} {results.length === 1 ? "risultato" : "risultati"}</span>
          {!pane && <>
            <span>GS</span>
            <span>Tipo</span>
            <span />
          </>}
        </div>
        {suggestion && <DidYouMean name={suggestion} onPick={setQ} className="mt-3" />}
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <Skull size={48} className="text-muted" aria-hidden="true" />
            <p className="font-serif text-lg italic text-muted">Nessuna creatura trovata.</p>
          </div>
        ) : (
          <ul onClickCapture={() => { if (pane) return; scroll.current = window.scrollY; save(); }}>
            {visible.map((monster, i) => (
              <li key={monster.id} className="catalog-row border-b border-divider">
                {i === approximateFrom && <SimilarResultsHeading className={i > 0 ? "" : "!mt-3"} />}
                {pane
                  ? <PaneRow monster={monster} fav={isFavorite(`mostro:${monster.id}`)} onToggle={toggleFavorite} selected={pane.selectedId === monster.id} noSrd={noSrd?.has(monster.id) ?? false} />
                  : <BestiaryRow monster={monster} fav={isFavorite(`mostro:${monster.id}`)} onToggle={toggleFavorite} noSrd={noSrd?.has(monster.id) ?? false} />}
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
      {/* No homebrew creature yet in this edition, so no «Homebrew» filter: the way to propose one stays here. */}
      {homebrewPart.shown && !homebrewPart.hidden && !hasHomebrew && !pane && (
        <p className="px-6 pb-6 pt-4 text-center text-[14px] text-muted" data-propose-homebrew="">
          Hai creato una creatura?{" "}
          <Link href="/bestiario/proponi" className="font-semibold text-primary underline underline-offset-4">Proponila per la raccolta Homebrew</Link>
        </p>
      )}
    </div>
  );
}

// Memoized: toggling one star re-renders only that row.
/** noSrd: the administrator sees «*» after the name of a NO SRD card (components/admin-edit/no-srd-mark.tsx). */
const BestiaryRow = memo(function BestiaryRow({ monster, fav, onToggle, noSrd = false }: { monster: MonsterListItem; fav: boolean; onToggle: (id: string) => void; noSrd?: boolean }) {
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
          <span className="block break-words font-serif text-[21px] font-bold leading-tight text-foreground">{monster.nome}{noSrd && <NoSrdMark />}{monster.nascosta && <> <HiddenTag /></>}</span>
          <span className="block truncate text-[15px] text-muted">{monster.taglia}</span>
          {monster.homebrew && <HomebrewLine monster={monster} />}
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

// The list column of the computer (320 px): GS badge on the left, name, type.
const PaneRow = memo(function PaneRow({ monster, fav, onToggle, selected, noSrd = false }: { monster: MonsterListItem; fav: boolean; onToggle: (id: string) => void; selected: boolean; noSrd?: boolean }) {
  const favId = `mostro:${monster.id}`;
  const href = `/mostro/${monster.id}`;
  const prefetch = useIntentPrefetch(href);
  return (
    <div className={`flex min-h-[58px] items-center gap-2.5${selected ? " -mx-3 rounded-[10px] bg-primary-faint px-3 shadow-[inset_3px_0_0_var(--color-primary)]" : ""}`}>
      <Link href={href} prefetch={false} onMouseEnter={prefetch} aria-current={selected ? "page" : undefined} className="flex min-w-0 flex-1 items-center gap-3 py-2">
        <span className="grid h-9 min-w-10 shrink-0 place-items-center rounded-[8px] bg-primary px-1.5 font-serif text-[15px] font-bold tabular-nums text-primary-foreground">{monster.grado_sfida || "—"}</span>
        <span className="min-w-0">
          <span className="block truncate font-serif text-[19px] font-bold leading-tight text-foreground">{monster.nome}{noSrd && <NoSrdMark />}</span>
          <span className="block truncate text-[14px] text-muted">{typeCategory(monster.tipo)}</span>
          {monster.homebrew && <HomebrewLine monster={monster} />}
          {monster.nascosta && <HiddenTag />}
        </span>
      </Link>
      <button type="button" onClick={() => onToggle(favId)} aria-label={fav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"} aria-pressed={fav}
        className="grid size-11 shrink-0 place-items-center transition-transform active:scale-90">
        <Star size={22} strokeWidth={1.75} className={fav ? "fill-primary text-primary" : "text-primary"} />
      </button>
    </div>
  );
});

/** The pills and the author of a homebrew row: «Homebrew», «2014 e 2024», «di <nickname>» or «del Grimorio». */
function HomebrewLine({ monster }: { monster: MonsterListItem }) {
  return (
    <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <HomebrewPill />
      {monster.entrambe && <BothEditionsPill />}
      <span className="text-[13px] text-muted">{authorLine(monster.autore, "list")}</span>
    </span>
  );
}

/** At the top of the Homebrew collection: what it is, and the way to propose a creature. */
function HomebrewIntro() {
  return (
    <div className="mx-6 mb-2 rounded-[12px] border-2 border-[#E0A21A] bg-card p-4">
      <p className="flex gap-2 text-[15px] leading-6 text-foreground">
        <FlaskConical size={20} className="mt-0.5 shrink-0 text-[#5C3F00]" aria-hidden="true" />
        Creature create dai master della community. Non sono ufficiali e non fanno parte dell’SRD.
      </p>
      <Link href="/bestiario/proponi" className="mt-3 flex min-h-11 items-center justify-center rounded-[8px] bg-primary px-4 text-[15px] font-bold text-primary-foreground">
        Proponi una creatura
      </Link>
    </div>
  );
}
