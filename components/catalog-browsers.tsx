"use client";

import { useEffect, useRef, useState } from "react";
import { useUserEdition } from "@/components/edition/edition-provider";
import { GrimorioBrowser } from "@/components/grimorio-browser";
import { BestiarioBrowser } from "@/components/bestiario-browser";
import type { SpellListItem, SpellsMeta } from "@/lib/spells-types";
import type { MonsterListItem } from "@/lib/monsters-types";
import { readListState, returningBack } from "@/components/navigation-memory";
import type { SpellFilters, SpellListState } from "@/components/grimorio-browser";
import { CASTING_TIMES, type CastingTime } from "@/lib/spells-types";
import { GS_BANDS, gsBand, type GsBand, type MonsterFilters, type MonsterListState } from "@/components/bestiario-browser";
import { isEdition } from "@/lib/user-edition";
import { parseGs } from "@/lib/monsters-types";
import { normalizeHabitats } from "@/lib/habitats";

// Server rendering and initial hydration show real, unfiltered rows. URL filters
// are applied after mount, without a useSearchParams/Suspense client bailout.
// listPath: the list column of the computer layout reads the address only while it is the list's own
// (/grimorio, /bestiario), so opening a card keeps the filters it came with.
function useCatalogSearch(listPath?: string) {
  const [search, setSearch] = useState("");
  // Also sync after a same-route client navigation that renders this component.
  useEffect(() => { if (!listPath || window.location.pathname === listPath) setSearch(window.location.search); });
  useEffect(() => {
    const sync = () => { if (!listPath || window.location.pathname === listPath) setSearch(window.location.search); };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [listPath]);
  return { params: new URLSearchParams(search), search };
}

/** The list column of the computer layout (components/layout/catalog-split.tsx): the open card is highlighted. */
export interface ListPane { selectedId?: string }

// After "back" from a card, restore the list exactly as it was left
// (search, filters, pages shown, scroll). Other arrivals start fresh.
// The list column of the computer stays mounted, so it never needs this (pane).
function useRestoredList<T extends { url: string }>(key: string, search: string, pane?: ListPane) {
  const [restored, setRestored] = useState<T | null>(null);
  // Read during the first client render: the freshly mounted list saves its own
  // state in an effect that runs before this component's effects.
  const snapshot = useRef<T | null | undefined>(undefined);
  if (snapshot.current === undefined && typeof window !== "undefined") {
    snapshot.current = !pane && returningBack() ? readListState<T>(key) : null;
  }
  useEffect(() => {
    const saved = snapshot.current;
    if (saved && saved.url === window.location.search) setRestored(saved);
  }, []);
  // Only while the address is still the one the list was left at.
  return restored && restored.url === search ? restored : null;
}
/** Spell filters from the address: older single values (?livello=3&scuola=…&classe=…) keep working. */
export function spellFiltersFromParams(params: URLSearchParams): SpellFilters {
  const list = (name: string) => (params.get(name) || "").split(",").map(value => value.trim()).filter(Boolean);
  return {
    livello: list("livello").map(value => parseInt(value, 10)).filter(value => !Number.isNaN(value)),
    scuola: list("scuola"),
    classe: list("classe"),
    tempo: list("tempo").filter((value): value is CastingTime => (CASTING_TIMES as readonly string[]).includes(value)),
    concentrazione: params.get("concentrazione") === "1",
    rituale: params.get("rituale") === "1",
  };
}

export function GrimorioWithFilters({ spells, meta, pane }: { spells: SpellListItem[]; meta: SpellsMeta; pane?: ListPane }) {
  const { params, search } = useCatalogSearch(pane ? "/grimorio" : undefined);
  const filters = spellFiltersFromParams(params);
  const requested = params.get("edizione");
  // An edition in the address opens the list there without changing «la tua edizione».
  const { edition: userEdition, ready } = useUserEdition();
  const edizione = isEdition(requested) ? requested : userEdition;
  const restored = useRestoredList<SpellListState>("grimorio", search, pane);
  const restoredFilters: SpellFilters | null = restored && Array.isArray(restored.livello)
    ? { livello: restored.livello, scuola: restored.scuola, classe: restored.classe, tempo: Array.isArray(restored.tempo) ? restored.tempo : [], concentrazione: restored.concentrazione, rituale: restored.rituale }
    : null;
  return <GrimorioBrowser key={JSON.stringify([filters, !!restoredFilters])}
    spells={spells} meta={meta} initialFilters={restoredFilters ?? filters}
    initialEdizione={restoredFilters ? restored!.edizione : edizione} edizione={edizione} editionReady={ready}
    initialQuery={restoredFilters ? restored!.q : undefined} initialLimit={restoredFilters ? restored!.limit : undefined}
    initialScroll={restoredFilters ? restored!.scroll : undefined} pane={pane} />;
}

/** Filters from the address: old single values (?gs=1/2, ?raccolta=animali, ?tipo=Drago) keep working. */
export function filtersFromParams(params: URLSearchParams): MonsterFilters {
  const list = (name: string) => (params.get(name) || "").split(",").map(value => value.trim()).filter(Boolean);
  const collection = params.get("raccolta") || params.get("categoria");
  const gs = list("gs").map(value => (GS_BANDS as readonly string[]).includes(value) ? value as GsBand : gsBand(parseGs(value)))
    .filter((value, index, all) => all.indexOf(value) === index);
  return {
    categoria: collection === "animali" || collection === "mostri" ? collection : "tutti",
    gs: GS_BANDS.filter(band => gs.includes(band)),
    tipo: list("tipo"),
    taglia: list("taglia"),
    habitat: normalizeHabitats(list("habitat")),
  };
}

export function BestiarioWithFilters({ monsters, pane }: { monsters: MonsterListItem[]; pane?: ListPane }) {
  const { params, search } = useCatalogSearch(pane ? "/bestiario" : undefined);
  const filters = filtersFromParams(params);
  const requested = params.get("edizione");
  const { edition: userEdition, ready } = useUserEdition();
  const edizione = isEdition(requested) ? requested : userEdition;
  const restored = useRestoredList<MonsterListState>("bestiario", search, pane);
  const restoredFilters: MonsterFilters | null = restored && Array.isArray(restored.gs)
    ? { categoria: restored.categoria, gs: restored.gs, tipo: restored.tipo, taglia: restored.taglia, habitat: restored.habitat }
    : null;
  return <BestiarioBrowser key={JSON.stringify([filters, !!restoredFilters])}
    monsters={monsters} initialFilters={restoredFilters ?? filters}
    initialEdizione={restoredFilters ? restored!.edizione : edizione} edizione={edizione} editionReady={ready}
    initialQuery={restoredFilters ? restored!.q : undefined} initialLimit={restoredFilters ? restored!.limit : undefined}
    initialScroll={restoredFilters ? restored!.scroll : undefined} pane={pane} />;
}
