"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { fold } from "@/lib/search";

interface Item { id: string; nome: string; etichetta: string; modificato: boolean }

/** Cards of one section in one edition, with a search and the «MODIFICATO» label. */
export function AdminContentList({ section, edition, items }: { section: string; edition: string; items: Item[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const wanted = fold(query.trim());
    return wanted ? items.filter(item => fold(item.nome).includes(wanted)) : items;
  }, [items, query]);
  return (
    <>
      <label className="block">
        <span className="sr-only">Cerca una scheda</span>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cerca…" autoComplete="off"
          className="block min-h-11 w-full rounded-xl border-[1.5px] border-border bg-card px-3.5 text-base outline-none placeholder:text-[#8a7a66] focus:border-primary" />
      </label>
      <p className="text-sm text-muted" role="status">{shown.length} {shown.length === 1 ? "scheda" : "schede"} · {items.filter(item => item.modificato).length} modificate</p>
      <ul className="overflow-hidden rounded-[14px] border-[1.5px] border-border bg-card">
        {shown.map(item => (
          <li key={item.id} className="border-t border-elevated first:border-t-0">
            <Link href={`/admin/contenuti/${section}/${item.id}?edizione=${edition}`} prefetch={false} className="flex min-h-[50px] items-center gap-2 px-3.5 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="block text-base">{item.nome}</span>
                <span className="block text-xs text-muted">{item.etichetta}</span>
              </span>
              {item.modificato && <span className="shrink-0 rounded-[10px] bg-amber px-2 py-0.5 text-[11px] font-bold text-foreground">MODIFICATO</span>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
