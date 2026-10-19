"use client";

import { useEffect, useState } from "react";
import { GrimorioBrowser } from "@/components/grimorio-browser";
import { BestiarioBrowser } from "@/components/bestiario-browser";
import type { SpellListItem, SpellsMeta } from "@/lib/spells-types";
import type { MonsterListItem } from "@/lib/monsters-types";

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
  return new URLSearchParams(search);
}
export function GrimorioWithFilters({ spells, meta }: { spells: SpellListItem[]; meta: SpellsMeta }) {
  const params = useCatalogSearch();
  const level = params.get("livello");
  const parsed = level ? parseInt(level, 10) : NaN;
  const scuola = params.get("scuola") || null;
  const classe = params.get("classe") || null;
  const livello = Number.isNaN(parsed) ? null : parsed;
  return <GrimorioBrowser key={JSON.stringify([livello, scuola, classe])}
    spells={spells} meta={meta} initialLivello={livello}
    initialScuola={scuola} initialClasse={classe} />;
}

export function BestiarioWithFilters({ monsters }: { monsters: MonsterListItem[] }) {
  const params = useCatalogSearch();
  const taglia = params.get("taglia") || null;
  const tipo = params.get("tipo") || null;
  const gs = params.get("gs") || null;
  const collection = params.get("raccolta");
  const raccolta = collection === "animali" || collection === "mostri" ? collection : null;
  return <BestiarioBrowser key={JSON.stringify([taglia, tipo, gs, raccolta])}
    monsters={monsters} initialTaglia={taglia} initialTipo={tipo}
    initialGs={gs} initialRaccolta={raccolta} />;
}
