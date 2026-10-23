"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { BestiarioWithFilters, GrimorioWithFilters } from "@/components/catalog-browsers";
import { useDesktop } from "@/components/layout/use-desktop";
import type { MonsterListItem } from "@/lib/monsters-types";
import type { SpellListItem, SpellsMeta } from "@/lib/spells-types";

type Kind = "incantesimi" | "bestiario";
type Data = { spells: SpellListItem[]; meta: SpellsMeta } | { monsters: MonsterListItem[] };

// One download per visit: the list then stays in memory while moving between list and cards.
const loaded: Partial<Record<Kind, Promise<Data | null>>> = {};
function loadList(kind: Kind): Promise<Data | null> {
  loaded[kind] ??= fetch(`/api/catalogo/${kind}`).then(response => (response.ok ? response.json() : null)).catch(() => {
    delete loaded[kind];
    return null;
  });
  return loaded[kind]!;
}

/**
 * Computer (≥1024 px): the list in its own column on the left, the card on the right, each scrolling on
 * its own and as tall as the window. This component lives in the root layout, so it stays mounted while
 * moving between /grimorio and /spell/… (or /bestiario and /mostro/…): search, filters, edition and the
 * scroll of the list are kept, and a click on another row changes only the card. The addresses stay the
 * same. On a phone the column is never filled (nothing is downloaded) and the pages are as before.
 */
export function CatalogSplit({ kind, children }: { kind: Kind; children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const desktop = useDesktop();
  const [data, setData] = useState<Data | null>(null);
  const detail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!desktop) return;
    let live = true;
    void loadList(kind).then(result => { if (live) setData(result); });
    return () => { live = false; };
  }, [desktop, kind]);
  // A new card starts from its top (the window does not scroll here, the card column does).
  useEffect(() => { detail.current?.scrollTo({ top: 0 }); }, [pathname]);
  const selectedId = decodeURIComponent(pathname.split("/")[2] ?? "");
  const list = desktop && data
    ? "spells" in data
      ? kind === "incantesimi" && <GrimorioWithFilters spells={data.spells} meta={data.meta} pane={{ selectedId }} />
      : kind === "bestiario" && <BestiarioWithFilters monsters={data.monsters} pane={{ selectedId }} />
    : null;
  return (
    <div className={`lg:grid lg:h-dvh ${kind === "incantesimi" ? "lg:grid-cols-[400px_minmax(0,1fr)]" : "lg:grid-cols-[320px_minmax(0,1fr)]"}`}>
      <aside aria-label={kind === "incantesimi" ? "Elenco degli incantesimi" : "Elenco del bestiario"}
        className="hidden overscroll-contain border-r border-border lg:block lg:h-dvh lg:overflow-y-auto">
        {list || (desktop && <p className="px-6 py-10 text-center text-sm text-muted">Carico l’elenco…</p>)}
      </aside>
      <div ref={detail} className="min-w-0 lg:h-dvh lg:overflow-y-auto">{children}</div>
    </div>
  );
}

/** /grimorio and /bestiario on a computer: the list is in the left column, the right one waits for a card. */
export function EmptyCard({ text }: { text: string }) {
  return (
    <div className="hidden h-full min-h-[60vh] items-center justify-center px-10 text-center lg:flex">
      <p className="max-w-sm font-serif text-2xl italic text-muted">{text}</p>
    </div>
  );
}
