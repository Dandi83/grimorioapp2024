"use client";

import { useEffect, useRef, useState } from "react";
import { GrimorioBrowser } from "@/components/grimorio-browser";
import { BestiarioBrowser } from "@/components/bestiario-browser";
import type { SpellListItem, SpellsMeta } from "@/lib/spells-types";
import type { MonsterListItem } from "@/lib/monsters-types";
import { readListState, returningBack } from "@/components/navigation-memory";
import type { SpellListState } from "@/components/grimorio-browser";
import { EDITION_KEY, type Edition, type MonsterListState } from "@/components/bestiario-browser";
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
export function GrimorioWithFilters({ spells, meta }: { spells: SpellListItem[]; meta: SpellsMeta }) {
  const { params, search } = useCatalogSearch();
  const level = params.get("livello");
  const parsed = level ? parseInt(level, 10) : NaN;
  const scuola = params.get("scuola") || null;
  const classe = params.get("classe") || null;
  const livello = Number.isNaN(parsed) ? null : parsed;
  const restored = useRestoredList<SpellListState>("grimorio", search);
  return <GrimorioBrowser key={JSON.stringify([livello, scuola, classe, !!restored])}
    spells={spells} meta={meta} initialLivello={restored ? restored.livello : livello}
    initialScuola={restored ? restored.scuola : scuola} initialClasse={restored ? restored.classe : classe}
    initialQuery={restored?.q} initialLimit={restored?.limit} initialScroll={restored?.scroll} />;
}

const isEdition = (value: string | null): value is Edition => value === "2024" || value === "2014";

// The edition last chosen on this phone, read after mount like the URL filters.
function useStoredEdition() {
  const [stored, setStored] = useState<Edition | null>(null);
  useEffect(() => {
    try {
      const value = window.localStorage.getItem(EDITION_KEY);
      if (isEdition(value)) setStored(value);
    } catch {
      // storage unavailable: 2024
    }
  }, []);
  return stored;
}

export function BestiarioWithFilters({ monsters }: { monsters: MonsterListItem[] }) {
  const { params, search } = useCatalogSearch();
  const taglia = params.get("taglia") || null;
  const tipo = params.get("tipo") || null;
  const gs = params.get("gs") || null;
  const collection = params.get("raccolta");
  const raccolta = collection === "animali" || collection === "mostri" ? collection : null;
  const requested = params.get("edizione");
  const storedEdition = useStoredEdition();
  const edizione = isEdition(requested) ? requested : storedEdition ?? "2024";
  const habitatParam = params.get("habitat");
  const habitat = habitatParam ? normalizeHabitats(habitatParam.split(",")) : [];
  const restored = useRestoredList<MonsterListState>("bestiario", search);
  return <BestiarioBrowser key={JSON.stringify([taglia, tipo, gs, raccolta, edizione, habitat, !!restored])}
    monsters={monsters} initialTaglia={restored ? restored.taglia : taglia} initialTipo={restored ? restored.tipo : tipo}
    initialGs={restored ? restored.gs : gs} initialRaccolta={restored ? restored.raccolta : raccolta}
    initialEdizione={restored?.edizione ?? edizione} initialHabitat={restored?.habitat ?? habitat}
    initialQuery={restored?.q} initialLimit={restored?.limit} initialScroll={restored?.scroll} />;
}
