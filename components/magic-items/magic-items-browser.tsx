"use client";

import { englishShown } from "@/lib/english-match";
import { InEnglish } from "@/components/search/in-english";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ActiveFilters, FilterGroup, FilterSheet, SearchAndFilters, type ActiveFilter } from "@/components/catalog-ui";
import { RarityChip } from "@/components/magic-items/rarity-chip";
import { ParentLink } from "@/components/section-tiles";
import { useEquipmentEdition } from "@/components/equipment/use-equipment-edition";
import { SectionEditionPill } from "@/components/edition/edition-pill";
import {
  ATTUNEMENT_FILTERS, MAGIC_ITEM_RARITIES, MAGIC_ITEM_TYPES, NO_MAGIC_ITEM_FILTERS,
  findMagicItems, magicItemFiltersFromParams, magicItemSearch, searchMagicItems,
  type MagicItemEdition, type MagicItemFilters, type MagicItemListRow,
} from "@/lib/magic-items-types";
import { DidYouMean, SimilarResultsHeading, useSettledQuery } from "@/components/search/did-you-mean";

const SOURCE: Record<MagicItemEdition, string> = { "2024": "SRD 5.2.1", "2014": "SRD 5.1" };

const toggle = <T,>(list: readonly T[], value: T, order: readonly T[]) =>
  list.includes(value) ? list.filter(item => item !== value) : order.filter(item => item === value || list.includes(item));

function ItemRow({ row, query, settled }: { row: MagicItemListRow; query: string; settled: boolean }) {
  return (
    <li className="border-b border-divider last:border-b-0">
      <Link href={row.href} prefetch={false} className="flex min-h-14 items-center gap-3 px-3.5 py-2">
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-xl font-bold leading-tight">{row.nome}</span>
          <InEnglish shown={englishShown(row.nome, row.en, query, { settled })} className="mt-0.5" />
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-[14px] text-muted">{row.tipo}</span>
            <RarityChip printed={row.rarita} categories={row.rarita_categorie} />
            {row.sintonia && <span className="inline-flex min-h-7 items-center rounded-[6px] border border-chip-border px-2 text-[13px] font-semibold text-primary">Sintonia</span>}
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
      </Link>
    </li>
  );
}

/**
 * Magic items A–Z of the chosen edition (the choice of the Equipaggiamento section, remembered on the
 * phone): search by name, filters by rarity, type and attunement combined ("o" inside a filter, "e"
 * between filters). Search and filters live in the address.
 */
export function MagicItemsBrowser({ rows: byEdition, title = "Oggetti magici", rulesHref }: {
  rows: Record<MagicItemEdition, MagicItemListRow[]>;
  title?: string;
  /** The manual entry with the rules on magic items, when the manual is published. */
  rulesHref?: string;
}) {
  const [edition, setEdition] = useEquipmentEdition("oggetti-magici");
  const rows = byEdition[edition];
  const [missing, setMissing] = useState<MagicItemEdition>();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<MagicItemFilters>(NO_MAGIC_ITEM_FILTERS);
  const [draft, setDraft] = useState<MagicItemFilters | null>(null);
  // Pages are static (and saved for offline use): the address is read after mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromAddress = magicItemFiltersFromParams(params);
    if (fromAddress.rarita.length || fromAddress.tipo.length || fromAddress.sintonia.length) setFilters(fromAddress);
    if (params.get("q")) setQuery(params.get("q")!);
    // "?manca=2014": a sheet sent us back because the item is not in that edition.
    const absent = params.get("manca");
    if (absent === "2014" || absent === "2024") {
      setMissing(absent);
      const url = new URL(window.location.href);
      url.searchParams.delete("manca");
      window.history.replaceState(window.history.state, "", url);
    }
  }, []);
  // Every change is written back to the address, so a shared or reopened link shows the same list.
  const show = (nextFilters: MagicItemFilters, nextQuery: string) => {
    setFilters(nextFilters);
    setQuery(nextQuery);
    const search = magicItemSearch(window.location.search, nextFilters, nextQuery);
    if (search !== window.location.search) window.history.replaceState(window.history.state, "", window.location.pathname + search);
  };

  const settled = useSettledQuery(query);
  const result = useMemo(() => findMagicItems(rows, query, filters, settled), [rows, query, filters, settled]);
  const found = useMemo(() => [...result.exact, ...result.approximate], [result]);
  const draftCount = useMemo(() => (draft ? searchMagicItems(rows, query, draft).length : 0), [rows, query, draft]);
  const active: ActiveFilter[] = [
    ...filters.rarita.map(value => ({ key: `rarita:${value}`, label: value, remove: () => show({ ...filters, rarita: filters.rarita.filter(x => x !== value) }, query) })),
    ...filters.tipo.map(value => ({ key: `tipo:${value}`, label: value, remove: () => show({ ...filters, tipo: filters.tipo.filter(x => x !== value) }, query) })),
    ...filters.sintonia.map(value => ({ key: `sintonia:${value}`, label: `Sintonia ${value.toLowerCase()}`, remove: () => show({ ...filters, sintonia: filters.sintonia.filter(x => x !== value) }, query) })),
  ];

  return (
    // px-6 like the other catalogs: the active filter labels scroll edge to edge (-mx-6).
    <div className="px-6 pb-8 pt-4">
      <ParentLink href="/compendio" label="Compendio" />
      {/* The long title keeps its line on phones: the edition pill sits under it, on the right. */}
      <h1 className="border-b-4 border-primary pb-3 font-serif text-[40px] font-bold leading-tight">{title}</h1>
      <div className="mt-3 flex justify-end empty:hidden lg:hidden">
        <SectionEditionPill section="oggetti-magici" edition={edition} choose={value => { setEdition(value); setMissing(undefined); }} />
      </div>
      {missing && <p role="status" className="mt-3 rounded-xl border border-primary/40 bg-card px-4 py-2.5 text-[15px] font-semibold text-primary">Questo oggetto non c’è nel {missing}.</p>}
      {rulesHref && (
        <Link href={rulesHref} className="mt-2 inline-flex min-h-11 items-center gap-1 text-[15px] font-bold text-primary underline underline-offset-4">
          Regole sugli oggetti magici
        </Link>
      )}
      <SearchAndFilters query={query} onQuery={value => show(filters, value)} label="Cerca un oggetto magico" active={active.length} onOpen={() => setDraft(filters)} />
      <ActiveFilters filters={active} />
      <FilterSheet open={draft !== null} onClose={() => setDraft(null)} onReset={() => setDraft(NO_MAGIC_ITEM_FILTERS)}
        onApply={() => { if (draft) show(draft, query); setDraft(null); }} count={draftCount}>
        {draft && <>
          <FilterGroup title="Rarità" options={MAGIC_ITEM_RARITIES} selected={draft.rarita}
            onToggle={value => setDraft({ ...draft, rarita: toggle(draft.rarita, value, MAGIC_ITEM_RARITIES) })} />
          <FilterGroup title="Tipo" options={MAGIC_ITEM_TYPES} selected={draft.tipo}
            onToggle={value => setDraft({ ...draft, tipo: toggle(draft.tipo, value, MAGIC_ITEM_TYPES) })} />
          <FilterGroup title="Sintonia" options={ATTUNEMENT_FILTERS} selected={draft.sintonia}
            onToggle={value => setDraft({ ...draft, sintonia: toggle(draft.sintonia, value, ATTUNEMENT_FILTERS) })} />
        </>}
      </FilterSheet>
      {result.suggestion && <DidYouMean name={result.suggestion.nome} onPick={value => show(filters, value)} className="mt-3" />}
      <div className="mt-4 flex items-end justify-between gap-3 border-b-2 border-primary pb-1.5">
        <p role="status" aria-live="polite" className="text-[15px] font-semibold">
          {found.length} {found.length === 1 ? "oggetto" : "oggetti"}{found.length === rows.length ? "" : ` su ${rows.length}`}
        </p>
        <p className="text-[14px] text-muted">{SOURCE[edition]}</p>
      </div>
      {found.length ? (
        <>
          {result.exact.length > 0 && (
            <ul data-exact-results="" className="overflow-hidden rounded-b-[14px] border border-t-0 border-border bg-card">
              {result.exact.map(row => <ItemRow key={row.id} row={row} query={query} settled={settled} />)}
            </ul>
          )}
          {result.approximate.length > 0 && <>
            <SimilarResultsHeading className={result.exact.length ? "" : "!mt-3"} />
            <ul data-similar-list="" className="overflow-hidden rounded-[14px] border border-border bg-card">
              {result.approximate.map(row => <ItemRow key={row.id} row={row} query={query} settled={settled} />)}
            </ul>
          </>}
        </>
      ) : (
        <p className="mt-3 text-[15px]">Nessun oggetto con questi criteri.</p>
      )}
    </div>
  );
}
