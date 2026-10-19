"use client";

import { useSearchParams } from "next/navigation";
import { GrimorioBrowser } from "@/components/grimorio-browser";
import { BestiarioBrowser } from "@/components/bestiario-browser";
import type { SpellListItem, SpellsMeta } from "@/lib/spells-types";
import type { MonsterListItem } from "@/lib/monsters-types";

// Keep request-specific filters out of the static server pages. The key resets
// local filter state when navigating to a different query on the same route.
export function GrimorioWithFilters({ spells, meta }: { spells: SpellListItem[]; meta: SpellsMeta }) {
  const params = useSearchParams();
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
  const params = useSearchParams();
  const taglia = params.get("taglia") || null;
  const tipo = params.get("tipo") || null;
  const gs = params.get("gs") || null;
  const collection = params.get("raccolta");
  const raccolta = collection === "animali" || collection === "mostri" ? collection : null;
  return <BestiarioBrowser key={JSON.stringify([taglia, tipo, gs, raccolta])}
    monsters={monsters} initialTaglia={taglia} initialTipo={tipo}
    initialGs={gs} initialRaccolta={raccolta} />;
}
