"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { useEquipmentEdition } from "@/components/equipment/use-equipment-edition";
import { ListSearch } from "@/components/equipment/list-search";
import { SectionEditionPill } from "@/components/edition/edition-pill";
import { ParentLink } from "@/components/section-tiles";
import type { EquipmentEdition } from "@/lib/equipment-types";

/** A row of the list: names and labels only, never the text of a feat (PROMPT 49). */
export interface FeatRow { id: string; nome: string; en?: string; categoria?: string; prerequisito?: string }
export interface FeatGroups { categories: { key: string; title: string }[]; rows: Record<EquipmentEdition, FeatRow[]> }

const fold = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function Row({ row, href }: { row: FeatRow; href: string }) {
  return (
    <li className="border-t border-divider first:border-t-0">
      <Link href={href} prefetch={false} className="flex min-h-12 items-center gap-2.5 px-3.5 py-2" data-feat-row={row.id}>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-primary">{row.nome}</span>
          {row.en && <span className="block text-[13px] italic text-muted" lang="en">{row.en}</span>}
          {row.prerequisito && <span className="block text-[13px] text-muted">Prerequisito: {row.prerequisito}</span>}
        </span>
        <ChevronRight size={16} strokeWidth={2.4} className="shrink-0 text-[#B9A57C]" aria-hidden="true" />
      </Link>
    </li>
  );
}

function Group({ title, rows, edition }: { title: string; rows: FeatRow[]; edition: EquipmentEdition }) {
  if (!rows.length) return null;
  return (
    <section className="mt-5" aria-label={title} data-feat-group={title}>
      <h2 className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[#5E4E3E]">{title}</h2>
      <ul className="overflow-hidden rounded-[14px] border-[1.5px] border-border bg-card">
        {rows.map(row => <Row key={row.id} row={row} href={`/talenti/${row.id}${edition === "2014" ? "?edizione=2014" : ""}`} />)}
      </ul>
    </section>
  );
}

/** The feats of the chosen edition, grouped by category, with «Cerca per nome…» and the category pills (2024). */
export function FeatsBrowser({ groups }: { groups: FeatGroups }) {
  const [edition, setEdition] = useEquipmentEdition("talenti");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const match = (row: FeatRow) => !query.trim() || fold(row.nome).includes(fold(query.trim())) || (!!row.en && fold(row.en).includes(fold(query.trim())));
  const rows = groups.rows[edition].filter(match);
  // In 2014 the feats printed only in 2024 are listed apart, each opening its 2024 sheet.
  const only2024 = edition === "2014" ? groups.rows["2024"].filter(row => !groups.rows["2014"].some(other => other.id === row.id)).filter(match) : [];
  return (
    <div className="px-4 pb-8 pt-4 sm:px-6">
      <ParentLink href="/compendio" label="Compendio" />
      <div className="flex items-center justify-between gap-3 border-b-4 border-primary pb-3">
        <h1 className="min-w-0 font-serif text-[40px] font-bold leading-tight">Talenti</h1>
        <SectionEditionPill section="talenti" edition={edition} choose={setEdition} />
      </div>
      <ListSearch label="Cerca un talento" value={query} onChange={setQuery} />
      {edition === "2024" && (
        <div role="group" aria-label="Categorie" className="mt-3 flex flex-wrap gap-2">
          {[{ key: "", title: "Tutti" }, ...groups.categories].map(item => {
            const active = (category ?? "") === item.key;
            return (
              <button key={item.key || "tutti"} type="button" aria-pressed={active} onClick={() => setCategory(item.key || null)}
                className={`min-h-11 rounded-full border px-4 text-[15px] font-semibold ${active ? "border-primary bg-primary text-primary-foreground" : "border-chip-border bg-card text-primary"}`}>
                {item.title}
              </button>
            );
          })}
        </div>
      )}
      {edition === "2024"
        ? groups.categories.filter(item => !category || item.key === category).map(item => (
          <Group key={item.key} title={item.title} rows={rows.filter(row => row.categoria === item.key)} edition={edition} />
        ))
        : <Group title="Talenti" rows={rows} edition={edition} />}
      {only2024.length > 0 && (
        <section className="mt-5" aria-label="Solo nel 2024" data-feat-group="Solo nel 2024">
          <h2 className="mb-1 text-[12px] font-bold uppercase tracking-[0.08em] text-[#5E4E3E]">Solo nel 2024</h2>
          <p className="mb-2 text-[14px] leading-6 text-muted">Nell’SRD 5.1 italiano non sono stampati: li trovi nell’edizione 2024.</p>
          <ul className="overflow-hidden rounded-[14px] border-[1.5px] border-border bg-card">
            {only2024.map(row => <Row key={row.id} row={row} href={`/talenti/${row.id}?edizione=2024`} />)}
          </ul>
        </section>
      )}
      {!rows.length && !only2024.length && <p role="status" className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-[15px]">Nessun talento con questo nome</p>}
    </div>
  );
}
