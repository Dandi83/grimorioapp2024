"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Skull, Star } from "lucide-react";

import { useFavorites } from "@/components/favorites-provider";
import { saveListState } from "@/components/navigation-memory";
import { HiddenTag } from "@/components/sections/hidden-tag";
import { NoSrdMark, useNoSrdIds } from "@/components/admin-edit/no-srd-mark";
import { useIntentPrefetch } from "@/components/use-intent-prefetch";
import { useRevealSelected } from "@/components/layout/use-reveal-selected";
import { useUserEdition } from "@/components/edition/edition-provider";
import { useFollowEdition } from "@/components/edition/use-follow-edition";
import { SoonEntry, useEditions, usePart } from "@/components/sections/parts-context";
import { ActiveFilters, CatalogTitle, FilterGroup, FilterSheet, SearchAndFilters, type ActiveFilter } from "@/components/catalog-ui";
import { collectionOf, computeMonstersMeta, isSrdAnimal, typeCategory, type MonsterListItem } from "@/lib/monsters-types";
import { BothEditionsPill, HomebrewPill } from "@/components/homebrew-pill";
import { authorLine } from "@/lib/homebrew-types";
import { COMMUNITY_HREF, CommunityHeader, GrimorioHeader, OriginalsBlock, OriginalsHeader, ProposeButton } from "@/components/homebrew/community-ui";
import { SectionEditionPill } from "@/components/edition/edition-pill";
import { HABITATS, matchesHabitats } from "@/lib/habitats";
import { useReportFilters, useReportSearch } from "@/components/statistics/use-report-search";
import { englishShown, namesOf, type EnglishShown } from "@/lib/english-match";
import { InEnglish } from "@/components/search/in-english";
import { searchList } from "@/lib/fuzzy-search";
import { DidYouMean, SimilarResultsHeading, usePreparedNames, useSettledQuery } from "@/components/search/did-you-mean";

export type Edition = "2024" | "2014";
const PAGE_SIZE = 40;

export type Category = "tutti" | "mostri" | "animali" | "homebrew";
const CATEGORIES: readonly Category[] = ["tutti", "mostri", "animali", "homebrew"];
const CATEGORY_LABEL: Record<Category, string> = { tutti: "Tutti", mostri: "Mostri", animali: "Animali", homebrew: "Creati da voi" };

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
 * "o" inside the same filter, "e" between different filters. The creatures of the community are only in their own
 * pages («Creati da voi», /bestiario/creati-da-voi); those of the editorial staff (PROMPT 25) are in the Bestiario too,
 * among the «Mostri». On the pages of the original creatures the category is not used (section decides).
 */
function matchesFilters(monster: MonsterListItem, filters: MonsterFilters, section?: OriginalsSection): boolean {
  if (section) return matchesDetails(monster, filters);
  if ((filters.categoria === "homebrew") !== (collectionOf(monster) === "homebrew")) return false;
  return matchesDetails(monster, filters);
}
function matchesDetails(monster: MonsterListItem, filters: MonsterFilters): boolean {
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
  /**
   * The pages of the original creatures (PROMPT 25): «community» /bestiario/creati-da-voi, «grimorio»
   * /bestiario/del-grimorio, «originali» /bestiario/creature-originali (both, alphabetical, with quick chips).
   */
  section?: OriginalsSection;
}

export type OriginalsSection = "community" | "grimorio" | "originali";
/** The quick chips of «Creature originali»: everyone, the editorial staff or the community. */
type Who = "tutti" | "community" | "grimorio";
const WHO_LABEL: Record<Who, string> = { tutti: "Tutte", grimorio: "Dalla redazione", community: "Dalla community" };
const whoOf = (monster: MonsterListItem): Who => (monster.autore ? "community" : "grimorio");
const inSection = (monster: MonsterListItem, section: OriginalsSection) => monster.homebrew
  && (section === "originali" || (section === "community") === !!monster.autore);

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
  section,
}: Props) {
  const community = section === "community";
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [who, setWho] = useState<Who>("tutti");
  const [filters, setFilters] = useState<MonsterFilters>(initialFilters);
  const [draft, setDraft] = useState<MonsterFilters | null>(null);
  const { choose: chooseUserEdition } = useUserEdition();
  const [chosenEdizione, setEdizione] = useState<Edition>(initialEdizione);
  useFollowEdition(targetEdizione, editionReady, setEdizione, () => setFilters(NO_FILTERS));
  // Editions and collections hidden from /admin/sezioni: never shown to the public, labelled for the administrator.
  const { allowed } = useEditions("bestiario");
  const edizione: Edition = allowed.includes(chosenEdizione) ? chosenEdizione : allowed[0];
  const monstersPart = usePart("bestiario", "mostri"), animalsPart = usePart("bestiario", "animali"), homebrewPart = usePart("bestiario", "homebrew");
  const grimorioPart = usePart("bestiario", "grimorio");
  const parts = { mostri: monstersPart, animali: animalsPart, homebrew: homebrewPart, grimorio: grimorioPart };
  const categoryLabel = (c: Category) => `${CATEGORY_LABEL[c]}${c !== "tutti" && parts[c].hidden ? (parts[c].soon ? " · In arrivo" : " · Nascosta") : ""}`;
  // Collections «In arrivo» for the public: an entry to the «in costruzione» page, never their creatures.
  const soonCollections = CATEGORIES.filter(c => c !== "tutti" && c !== "homebrew" && !parts[c].shown && parts[c].soon);
  // A homebrew «Entrambe» is in both editions.
  const collectionShown = (monster: MonsterListItem) => parts[collectionOf(monster)].shown;
  const [limit, setLimit] = useState(initialLimit);
  const deferredQ = useDeferredValue(q);
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  // The administrator only: «*» after the NO SRD cards, asked after the session check (never in the page).
  const noSrd = useNoSrdIds("mostri");

  const editionMonsters = useMemo(() => monsters.filter(monster => (monster.edizione === edizione || monster.entrambe)
    && collectionShown(monster) && (!section || inSection(monster, section))), [monsters, edizione, section, animalsPart.shown, monstersPart.shown, homebrewPart.shown, grimorioPart.shown]); // eslint-disable-line react-hooks/exhaustive-deps
  // «Creati da voi» only while the chosen edition has at least one published creature of the community: never an empty filter.
  const hasHomebrew = editionMonsters.some(monster => collectionOf(monster) === "homebrew");
  const categories = CATEGORIES.filter(c => c === "tutti" || (parts[c].shown && (c !== "homebrew" || hasHomebrew)));
  const meta = useMemo(() => computeMonstersMeta(editionMonsters), [editionMonsters]);
  // By challenge rating, then by name; «Creature originali» in alphabetical order.
  const byChallenge = useMemo(() => [...editionMonsters].sort((a, b) => (section === "originali" ? 0 : a.gs_num - b.gs_num) || a.nome.localeCompare(b.nome, "it")), [editionMonsters, section]);
  usePreparedNames(() => byChallenge.flatMap(m => (m.en ? [m.nome, m.en] : [m.nome])), byChallenge);
  // Accents, capitals and typos ignored (lib/fuzzy-search.ts): exact, starts with, contains (each by challenge), then
  // the approximate ones under «Risultati simili».
  const settled = useSettledQuery(deferredQ);
  const found = useMemo(() => searchList(byChallenge, deferredQ, m => namesOf(m.nome, m.en), { settled }), [byChallenge, deferredQ, settled]);
  const searched = useMemo(() => [...found.exact, ...found.approximate], [found]);
  // The searched name and how many creatures of the edition have it exactly (statistics, only with the consent).
  useReportSearch(deferredQ, found.exact.length, true, "bestiario");
  // The groups of filters turned on (statistics, only the names of the groups): they leave with the next event.
  useReportFilters([...(filters.categoria !== "tutti" ? ["categoria" as const] : []), ...(["gs", "tipo", "taglia", "habitat"] as const).filter(group => filters[group].length > 0)]);

  const matches = useCallback((m: MonsterListItem) => matchesFilters(m, filters, section)
    && (section !== "originali" || who === "tutti" || whoOf(m) === who), [filters, section, who]);
  // The original creatures of the chosen edition (the «2014 e 2024» in both), shown to whoever may see them: the block
  // of the Bestiario and the chips of «Creature originali».
  const originals = useMemo(() => monsters.filter(monster => monster.homebrew && (monster.edizione === edizione || monster.entrambe)
    && collectionShown(monster)), [monsters, edizione, homebrewPart.shown, grimorioPart.shown]); // eslint-disable-line react-hooks/exhaustive-deps
  const whoCount = (value: Who) => originals.filter(monster => value === "tutti" || whoOf(monster) === value).length;
  const originalCounts = { grimorio: whoCount("grimorio"), community: whoCount("community") };
  const originalParts = { grimorio: grimorioPart, community: homebrewPart };
  const results = useMemo(() => searched.filter(matches), [searched, matches]);
  const approximateFrom = useMemo(() => found.exact.filter(matches).length, [found, matches]);
  const suggestion = found.suggestion && matches(found.suggestion) ? found.suggestion.nome : null;
  const draftCount = useMemo(() => draft ? searched.filter(m => matchesFilters(m, draft, section)).length : 0, [searched, draft, section]);

  // A new edition, search or filter starts again from the first page.
  const key = JSON.stringify([edizione, q, filters, who]);
  const lastKey = useRef(key);
  useEffect(() => {
    if (lastKey.current === key) return;
    lastKey.current = key;
    setLimit(PAGE_SIZE);
  }, [key]);
  const visible = useMemo(() => results.slice(0, limit), [results, limit]);
  // The line «in inglese» of each row shown, kept between renders (a star toggled re-renders one row only).
  const englishById = useMemo(() => new Map(visible.map(monster => [monster.id, englishShown(monster.nome, monster.en, deferredQ, { settled })])), [visible, deferredQ, settled]);

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
  useEffect(() => { if (!pane && !section) save(); });
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
    ...(filters.categoria !== "tutti" && !section ? [{ key: "categoria", label: CATEGORY_LABEL[filters.categoria], remove: () => setFilters(f => ({ ...f, categoria: "tutti" as const })) }] : []),
    ...filters.gs.map(band => ({ key: `gs:${band}`, label: `GS ${BAND_LABEL[band]}`, remove: () => setFilters(f => ({ ...f, gs: f.gs.filter(x => x !== band) })) })),
    ...filters.tipo.map(tipo => ({ key: `tipo:${tipo}`, label: tipo, remove: () => setFilters(f => ({ ...f, tipo: f.tipo.filter(x => x !== tipo) })) })),
    ...filters.taglia.map(taglia => ({ key: `taglia:${taglia}`, label: taglia, remove: () => setFilters(f => ({ ...f, taglia: f.taglia.filter(x => x !== taglia) })) })),
    ...filters.habitat.map(habitat => ({ key: `habitat:${habitat}`, label: habitat, remove: () => setFilters(f => ({ ...f, habitat: f.habitat.filter(x => x !== habitat) })) })),
  ];

  return (
    <div ref={root}>
      <div className="px-6 pb-2 pt-8">
        {section === "community" ? <CommunityHeader><SectionEditionPill section="bestiario" edition={edizione} choose={chooseEdition} /></CommunityHeader>
          : section === "grimorio" ? <GrimorioHeader><SectionEditionPill section="bestiario" edition={edizione} choose={chooseEdition} /></GrimorioHeader>
          : section === "originali" ? <OriginalsHeader><SectionEditionPill section="bestiario" edition={edizione} choose={chooseEdition} /></OriginalsHeader>
          : <CatalogTitle section="bestiario" title="Bestiario" edition={edizione} onEdition={chooseEdition} />}
        {section === "originali" && (
          <div role="group" aria-label="Chi l’ha creata" className="mt-4 flex flex-wrap gap-2" data-community-chips="">
            {(["tutti", "grimorio", "community"] as const).filter(value => value === "tutti" || (value === "grimorio" ? grimorioPart.shown : homebrewPart.shown)).map(value => (
              <button key={value} type="button" aria-pressed={who === value} onClick={() => setWho(value)} data-community-chip={value}
                className={`inline-flex min-h-11 items-center rounded-[22px] border-[1.5px] px-3.5 text-[15px] font-semibold ${who === value ? "border-[#7A1F2B] bg-[#7A1F2B] text-[#FFFBF0]" : "border-chip-border bg-card text-foreground"}`}>
                {WHO_LABEL[value]} · {whoCount(value)}
              </button>
            ))}
          </div>
        )}
        <SearchAndFilters query={q} onQuery={setQ} label="Cerca una creatura"
          placeholder={pane ? "Cerca…" : undefined} active={active.length} onOpen={() => setDraft(filters)} />
        <ActiveFilters filters={active} />
        {/* «Creature originali» (PROMPT 25): under the search and the filters, scrolling with the page. */}
        {!section && !pane && <OriginalsBlock counts={originalCounts} parts={originalParts} />}
      </div>

      <FilterSheet
        open={draft !== null}
        onClose={() => setDraft(null)}
        onReset={() => setDraft(NO_FILTERS)}
        onApply={() => {
          // «Creati da voi» leads to the list of the section.
          if (draft?.categoria === "homebrew" && !section) { setDraft(null); router.push(COMMUNITY_HREF); return; }
          if (draft) setFilters(draft); setDraft(null);
        }}
        count={draftCount}
      >
        {draft && <>
          {categories.length > 2 && !section && <div data-part="bestiario:mostri"><div data-part="bestiario:animali"><div data-part="bestiario:homebrew"><FilterGroup title="Categoria" segmented options={categories} selected={[draft.categoria]} label={categoryLabel}
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
        </>}
      </FilterSheet>

      <div className="px-6">
        {/* The computer column (PROMPT 17, 25): the same block, compact, above «N risultati». */}
        {pane && <OriginalsBlock compact counts={originalCounts} parts={originalParts} />}
        <div className={`${pane ? "flex" : "grid grid-cols-[minmax(0,1.3fr)_48px_minmax(0,0.8fr)_44px]"} items-end gap-2 border-b-2 border-border-strong pb-2 pt-4 text-[12px] font-bold uppercase tracking-[0.06em] text-muted`}>
          <span role="status" className="whitespace-nowrap" aria-live="polite">{pane ? "" : "Nome · "}{results.length} {results.length === 1 ? "risultato" : "risultati"}</span>
          {!pane && <>
            <span>GS</span>
            <span>Tipo</span>
            <span />
          </>}
        </div>
        {suggestion && <DidYouMean name={suggestion} onPick={setQ} className="mt-3" />}
        {community && editionMonsters.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center" data-community-empty="">
            <p className="font-serif text-xl font-bold text-foreground">Nessuna creatura ancora: proponi la prima!</p>
            <div className="w-full max-w-sm"><ProposeButton /></div>
          </div>
        ) : results.length === 0 ? (
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
                  ? <PaneRow monster={monster} fav={isFavorite(`mostro:${monster.id}`)} onToggle={toggleFavorite} selected={pane.selectedId === monster.id} noSrd={noSrd?.has(monster.id) ?? false} english={englishById.get(monster.id)} />
                  : <BestiaryRow monster={monster} fav={isFavorite(`mostro:${monster.id}`)} onToggle={toggleFavorite} noSrd={noSrd?.has(monster.id) ?? false} english={englishById.get(monster.id)} />}
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
      {section === "originali" && homebrewPart.shown && <div className="px-6 pb-6 pt-4"><ProposeButton /></div>}
    </div>
  );
}

// Memoized: toggling one star re-renders only that row.
/** noSrd: the administrator sees «*» after the name of a NO SRD card (components/admin-edit/no-srd-mark.tsx). */
const BestiaryRow = memo(function BestiaryRow({ monster, fav, onToggle, noSrd = false, english }: { monster: MonsterListItem; fav: boolean; onToggle: (id: string) => void; noSrd?: boolean; english?: EnglishShown }) {
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
          <InEnglish shown={english} />
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
const PaneRow = memo(function PaneRow({ monster, fav, onToggle, selected, noSrd = false, english }: { monster: MonsterListItem; fav: boolean; onToggle: (id: string) => void; selected: boolean; noSrd?: boolean; english?: EnglishShown }) {
  const favId = `mostro:${monster.id}`;
  const href = `/mostro/${monster.id}`;
  const prefetch = useIntentPrefetch(href);
  return (
    <div className={`flex min-h-[58px] items-center gap-2.5${selected ? " -mx-3 rounded-[10px] bg-primary-faint px-3 shadow-[inset_3px_0_0_var(--color-primary)]" : ""}`}>
      <Link href={href} prefetch={false} onMouseEnter={prefetch} aria-current={selected ? "page" : undefined} className="flex min-w-0 flex-1 items-center gap-3 py-2">
        <span className="grid h-9 min-w-10 shrink-0 place-items-center rounded-[8px] bg-primary px-1.5 font-serif text-[15px] font-bold tabular-nums text-primary-foreground">{monster.grado_sfida || "—"}</span>
        <span className="min-w-0">
          <span className="block truncate font-serif text-[19px] font-bold leading-tight text-foreground">{monster.nome}{noSrd && <NoSrdMark />}</span>
          <InEnglish shown={english} className="truncate" />
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

/** The pills and the author of a row of «I mostri creati da voi»: «Dalla community» and «di <nickname>», or «Dalla redazione»; «2014 e 2024». */
function HomebrewLine({ monster }: { monster: MonsterListItem }) {
  return (
    <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <HomebrewPill ours={!monster.autore} />
      {monster.entrambe && <BothEditionsPill />}
      {monster.autore && <span className="text-[13px] text-muted" data-homebrew-author="">{authorLine(monster.autore, "list")}</span>}
    </span>
  );
}
