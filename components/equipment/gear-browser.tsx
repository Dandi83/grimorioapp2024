"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminEditPencil } from "@/components/admin-edit/admin-edit-button";
import { ChevronRight, Search } from "lucide-react";

import { ParentLink } from "@/components/section-tiles";
import { useEquipmentEdition } from "@/components/equipment/use-equipment-edition";
import { HiddenTag } from "@/components/sections/hidden-tag";
import { SoonBlock } from "@/components/sections/soon-block";
import { usePart } from "@/components/sections/parts-context";
import { SectionEditionPill } from "@/components/edition/edition-pill";
import type { GearListRow } from "@/lib/adventuring-gear-editions";
import type { EquipmentEdition } from "@/lib/equipment-types";
import { DidYouMean, useSettledQuery } from "@/components/search/did-you-mean";
import { searchList } from "@/lib/fuzzy-search";
import { SEARCH_INPUT } from "@/lib/search-input";

const weight = (peso?: string) => (peso === "—" ? "peso trascurabile" : peso);

function GearRow({ row, edition }: { row: GearListRow; edition: EquipmentEdition }) {
  return (
    <li className="flex items-center border-b border-divider last:border-b-0">
      {/* Administrator only: the pencil next to the name opens its card in /admin/contenuti. */}
      <AdminEditPencil target={{ kind: "contenuto", section: "avventura", id: row.id, edition }} name={row.nome} />
      <Link href={row.href} prefetch={false} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3.5 py-2">
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-xl font-bold leading-tight">{row.nome}</span>
          {row.peso && <span className="block text-[14px] text-muted">{weight(row.peso)}</span>}
        </span>
        {row.prezzo && <span className="max-w-[45%] shrink-0 text-right text-[15px] font-semibold">{row.prezzo}</span>}
        <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
      </Link>
    </li>
  );
}

/** A 2014 group (Focus arcano, Munizioni…): its rows inside one card that opens the group sheet. */
function GroupRow({ row, edition }: { row: GearListRow; edition: EquipmentEdition }) {
  return (
    <li className="flex items-start border-b border-divider last:border-b-0">
      <span className="pt-2.5 empty:hidden"><AdminEditPencil target={{ kind: "contenuto", section: "avventura", id: row.id, edition }} name={row.nome} /></span>
      <Link href={row.href} prefetch={false} className="block min-w-0 flex-1 px-3.5 py-2">
        <span className="flex min-h-10 items-center gap-3">
          <span className="min-w-0 flex-1 font-serif text-xl font-bold leading-tight">{row.nome}</span>
          <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
        </span>
        <span className="mb-1 block overflow-hidden rounded-lg border border-divider">
          {row.righe!.map(item => (
            <span key={item.nome} className="flex items-baseline gap-3 border-b border-divider px-3 py-1.5 text-[15px] last:border-b-0">
              <span className="min-w-0 flex-1">{item.nome}<span className="block text-[13px] text-muted">{weight(item.peso)}</span></span>
              <span className="shrink-0 font-semibold">{item.costo}</span>
            </span>
          ))}
        </span>
      </Link>
    </li>
  );
}

/** Adventuring gear of both editions: packs first, then every item A–Z, searchable by name. */
export function GearBrowser({ rows }: { rows: Record<EquipmentEdition, GearListRow[]> }) {
  const [edition, setEdition] = useEquipmentEdition("avventura");
  // «Dotazioni» hidden from /admin/sezioni: not drawn for the public, labelled for the administrator.
  const packsPart = usePart("avventura", "dotazioni");
  const [query, setQuery] = useState("");
  const [missing, setMissing] = useState<EquipmentEdition>();
  // "?manca=2014": a sheet sent us back because the object is not in that edition.
  useEffect(() => {
    const url = new URL(window.location.href);
    const value = url.searchParams.get("manca");
    if (value !== "2014" && value !== "2024") return;
    setMissing(value);
    url.searchParams.delete("manca");
    window.history.replaceState(window.history.state, "", url);
  }, []);
  const items = rows[edition];
  // A group (armi, munizioni…) is found by its own name or by one of its rows; typos are tolerated (lib/fuzzy-search.ts).
  const settled = useSettledQuery(query);
  const result = useMemo(() => searchList(items, query, row => [row.nome, ...(row.righe?.map(item => item.nome) ?? [])], { settled }), [items, query, settled]);
  const found = useMemo(() => [...result.exact, ...result.approximate], [result]);
  const packs = found.filter(row => row.dotazione);
  const count = items.reduce((sum, row) => sum + (row.righe?.length ?? 1), 0);
  return (
    <div className="px-4 pb-8 pt-4 sm:px-6">
      <ParentLink href="/equipaggiamento" label="Equipaggiamento" />
      {/* The long title takes the whole width; the edition pill sits under it, on the right. */}
      <h1 className="border-b-4 border-primary pb-3 font-serif text-[34px] font-bold leading-tight">Equipaggiamento d’avventura</h1>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-muted">{count} voci · {edition === "2024" ? "SRD 5.2.1" : "SRD 5.1"}</p>
        <SectionEditionPill section="avventura" edition={edition} choose={value => { setEdition(value); setMissing(undefined); }} />
      </div>
      {missing && <p role="status" className="mt-3 rounded-xl border border-primary/40 bg-card px-4 py-2.5 text-[15px] font-semibold text-primary">Questo oggetto non c’è nel {missing}.</p>}
      <label className="relative mt-4 block">
        <span className="sr-only">Cerca un oggetto</span>
        <Search size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input {...SEARCH_INPUT} value={query} onChange={event => setQuery(event.target.value)} placeholder="Cerca: corda, torcia…"
          className="min-h-12 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-[17px]" />
      </label>
      <p role="status" className="mt-2 text-sm text-muted">{found.length === items.length ? "" : `${found.length} ${found.length === 1 ? "oggetto trovato" : "oggetti trovati"}`}</p>
      {result.suggestion && <DidYouMean name={result.suggestion.nome} onPick={setQuery} className="mt-2" />}
      {packs.length > 0 && !packsPart.shown && packsPart.soon && <SoonBlock id="avventura:dotazioni" title="Dotazioni" className="mt-6" />}
      {packs.length > 0 && packsPart.shown && (
        <section aria-labelledby="dotazioni" data-part="avventura:dotazioni" className="mt-3">
          <div className="rounded-t-[14px] border-2 border-b-0 border-amber bg-[#FBEBC2] px-3.5 pb-1.5 pt-2">
            <h2 id="dotazioni" className="font-serif text-[22px] font-bold">Dotazioni{packsPart.hidden && <HiddenTag className="ml-2" />}</h2>
            <p className="text-sm text-muted">Pacchetti di oggetti pronti per l’avventura</p>
          </div>
          <ul className="overflow-hidden rounded-b-[14px] border-2 border-t-0 border-amber bg-card">
            {packs.map(row => <GearRow key={row.href} row={row} edition={edition} />)}
          </ul>
        </section>
      )}
      <section aria-labelledby="tutti" className="mt-5">
        <h2 id="tutti" className="border-b-2 border-primary px-0.5 pb-1.5 font-serif text-[22px] font-bold text-primary">Tutti gli oggetti</h2>
        {found.length ? (
          <ul className="overflow-hidden rounded-b-[14px] border border-t-0 border-border bg-card">
            {found.map(row => (row.righe ? <GroupRow key={row.href} row={row} edition={edition} /> : <GearRow key={row.href} row={row} edition={edition} />))}
          </ul>
        ) : (
          <p className="mt-3 text-[15px]">Nessun oggetto con questo nome.</p>
        )}
      </section>
    </div>
  );
}
