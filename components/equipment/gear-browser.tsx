"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";

import { ParentLink } from "@/components/section-tiles";
import type { GearListItem } from "@/lib/adventuring-gear";

const fold = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, " ");

function GearRow({ item }: { item: GearListItem }) {
  return (
    <li className="border-b border-divider last:border-b-0">
      <Link href={`/equipaggiamento/avventura/${item.id}`} prefetch={false} className="flex min-h-14 items-center gap-3 px-3.5 py-2">
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-xl font-bold leading-tight">{item.nome}</span>
          {item.peso && <span className="block text-[14px] text-muted">{item.peso === "—" ? "peso trascurabile" : item.peso}</span>}
        </span>
        <span className="max-w-[45%] shrink-0 text-right text-[15px] font-semibold">{item.prezzo}</span>
        <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
      </Link>
    </li>
  );
}

/** Adventuring gear (2024): packs first, then every item A–Z, searchable by name. */
export function GearBrowser({ items }: { items: GearListItem[] }) {
  const [query, setQuery] = useState("");
  const needle = fold(query.trim());
  const found = useMemo(() => (needle ? items.filter(item => fold(item.nome).includes(needle)) : items), [items, needle]);
  const packs = found.filter(item => item.dotazione);
  return (
    <div className="px-4 pb-8 pt-4 sm:px-6">
      <ParentLink href="/equipaggiamento" label="Equipaggiamento" />
      <h1 className="border-b-4 border-primary pb-3 font-serif text-[34px] font-bold leading-tight">Equipaggiamento d’avventura</h1>
      <p className="mt-2 text-[15px] text-muted">{items.length} oggetti · SRD 5.2.1</p>
      <p className="mt-1 text-sm text-muted">Edizione 2024. La 2014 arriva presto.</p>
      <label className="relative mt-4 block">
        <span className="sr-only">Cerca un oggetto</span>
        <Search size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cerca: corda, torcia…"
          className="min-h-12 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-[17px]" />
      </label>
      <p role="status" className="mt-2 text-sm text-muted">{found.length === items.length ? "" : `${found.length} ${found.length === 1 ? "oggetto trovato" : "oggetti trovati"}`}</p>
      {packs.length > 0 && (
        <section aria-labelledby="dotazioni" className="mt-3">
          <div className="rounded-t-[14px] border-2 border-b-0 border-amber bg-[#FBEBC2] px-3.5 pb-1.5 pt-2">
            <h2 id="dotazioni" className="font-serif text-[22px] font-bold">Dotazioni</h2>
            <p className="text-sm text-muted">Pacchetti di oggetti pronti per l’avventura</p>
          </div>
          <ul className="overflow-hidden rounded-b-[14px] border-2 border-t-0 border-amber bg-card">
            {packs.map(item => <GearRow key={item.id} item={item} />)}
          </ul>
        </section>
      )}
      <section aria-labelledby="tutti" className="mt-5">
        <h2 id="tutti" className="border-b-2 border-primary px-0.5 pb-1.5 font-serif text-[22px] font-bold text-primary">Tutti gli oggetti</h2>
        {found.length ? (
          <ul className="overflow-hidden rounded-b-[14px] border border-t-0 border-border bg-card">
            {found.map(item => <GearRow key={item.id} item={item} />)}
          </ul>
        ) : (
          <p className="mt-3 text-[15px]">Nessun oggetto con questo nome.</p>
        )}
      </section>
    </div>
  );
}
