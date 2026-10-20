"use client";

import { useEffect, useRef, useState } from "react";
import { GrimorioBrowser } from "@/components/grimorio-browser";
import { BestiarioBrowser } from "@/components/bestiario-browser";
import type { SpellListItem, SpellsMeta } from "@/lib/spells-types";
import type { MonsterListItem } from "@/lib/monsters-types";
import { readListState, returningBack } from "@/components/navigation-memory";
import { SPELL_EDITION_KEY, type SpellFilters, type SpellListState } from "@/components/grimorio-browser";
import { CASTING_TIMES, type CastingTime } from "@/lib/spells-types";
import { EDITION_KEY, GS_BANDS, gsBand, type Edition, type GsBand, type MonsterFilters, type MonsterListState } from "@/components/bestiario-browser";
import { parseGs } from "@/lib/monsters-types";
import { normalizeHabitats } from "@/lib/habitats";

// Server rendering and initial hydration show real, unfiltered rows. URL filters
// are applied after mount, without a useSearchParams/Suspense client bailout.
function useCatalogSearch() {
  const [search, setSearch] = useState("");
  // Also sync after a same-route client navigation that renders this component.
  useEffect(() => { setSearch(window.location.search); });
  useEffect(() => {
    const sync = () => setSearch(window.location.search);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  return { params: new URLSearchParams(search), search };
}

// After "back" from a card, restore the list exactly as it was left
// (search, filters, pages shown, scroll). Other arrivals start fresh.
function useRestoredList<T extends { url: string }>(key: string, search: string) {
  const [restored, setRestored] = useState<T | null>(null);
  // Read during the first client render: the freshly mounted list saves its own
  // state in an effect that runs before this component's effects.
  const snapshot = useRef<T | null | undefined>(undefined);
  if (snapshot.current === undefined && typeof window !== "undefined") {
    snapshot.current = returningBack() ? readListState<T>(key) : null;
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

export function GrimorioWithFilters({ spells, meta }: { spells: SpellListItem[]; meta: SpellsMeta }) {
  const { params, search } = useCatalogSearch();
  const filters = spellFiltersFromParams(params);
  const requested = params.get("edizione");
  const storedEdition = useStoredEdition(SPELL_EDITION_KEY);
  const edizione = isEdition(requested) ? requested : storedEdition ?? "2024";
  const restored = useRestoredList<SpellListState>("grimorio", search);
  const restoredFilters: SpellFilters | null = restored && Array.isArray(restored.livello)
    ? { livello: restored.livello, scuola: restored.scuola, classe: restored.classe, tempo: Array.isArray(restored.tempo) ? restored.tempo : [], concentrazione: restored.concentrazione, rituale: restored.rituale }
    : null;
  return <GrimorioBrowser key={JSON.stringify([filters, edizione, !!restoredFilters])}
    spells={spells} meta={meta} initialFilters={restoredFilters ?? filters}
    initialEdizione={restoredFilters ? restored!.edizione : edizione}
    initialQuery={restoredFilters ? restored!.q : undefined} initialLimit={restoredFilters ? restored!.limit : undefined}
    initialScroll={restoredFilters ? restored!.scroll : undefined} />;
}

const isEdition = (value: string | null): value is Edition => value === "2024" || value === "2014";

// The edition last chosen on this phone, read after mount like the URL filters.
function useStoredEdition(storageKey: string = EDITION_KEY) {
  const [stored, setStored] = useState<Edition | null>(null);
  useEffect(() => {
    try {
      const value = window.localStorage.getItem(storageKey);
      if (isEdition(value)) setStored(value);
    } catch {
      // storage unavailable: 2024
    }
  }, [storageKey]);
  return stored;
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

export function BestiarioWithFilters({ monsters }: { monsters: MonsterListItem[] }) {
  const { params, search } = useCatalogSearch();
  const filters = filtersFromParams(params);
  const requested = params.get("edizione");
  const storedEdition = useStoredEdition();
  const edizione = isEdition(requested) ? requested : storedEdition ?? "2024";
  const restored = useRestoredList<MonsterListState>("bestiario", search);
  const restoredFilters: MonsterFilters | null = restored && Array.isArray(restored.gs)
    ? { categoria: restored.categoria, gs: restored.gs, tipo: restored.tipo, taglia: restored.taglia, habitat: restored.habitat }
    : null;
  return <BestiarioBrowser key={JSON.stringify([filters, edizione, !!restoredFilters])}
    monsters={monsters} initialFilters={restoredFilters ?? filters}
    initialEdizione={restoredFilters ? restored!.edizione : edizione}
    initialQuery={restoredFilters ? restored!.q : undefined} initialLimit={restoredFilters ? restored!.limit : undefined}
    initialScroll={restoredFilters ? restored!.scroll : undefined} />;
}
