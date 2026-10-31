"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { AdminEditPencil } from "@/components/admin-edit/admin-edit-button";
import { ChevronRight } from "lucide-react";

import { ParentLink } from "@/components/section-tiles";
import { useEquipmentEdition } from "@/components/equipment/use-equipment-edition";
import { SectionEditionPill } from "@/components/edition/edition-pill";
import type { ToolListRow } from "@/lib/tools-editions";
import type { EquipmentEdition } from "@/lib/equipment-types";
import { DidYouMean, useSettledQuery } from "@/components/search/did-you-mean";
import { normalizeSearch, searchList } from "@/lib/fuzzy-search";
import { ListSearch } from "@/components/equipment/list-search";
import { englishShown, namesOf, type EnglishShown } from "@/lib/english-match";
import { InEnglish } from "@/components/search/in-english";

const GROUPS: Record<EquipmentEdition, [string, string][]> = {
  "2024": [["artigiano", "Strumenti da artigiano"], ["altri", "Altri strumenti"]],
  "2014": [["artigiano", "Strumenti da artigiano"], ["giochi", "Giochi"], ["musicali", "Strumenti musicali"], ["altri", "Altri strumenti"]],
};

function ToolRow({ row, edition, english }: { row: ToolListRow; edition: EquipmentEdition; english?: EnglishShown }) {
  return (
    <li className="flex items-center border-b border-divider last:border-b-0">
      {/* Administrator only: the pencil next to the name opens its card in /admin/contenuti. */}
      <AdminEditPencil target={{ kind: "contenuto", section: "strumenti", id: row.id, edition }} name={row.nome} />
      <Link href={row.href} prefetch={false} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3.5 py-2">
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-xl font-bold leading-tight">{row.nome}</span>
          <InEnglish shown={english} className="mt-0.5" />
          <span className="block text-[14px] text-muted">{row.peso === "—" ? "peso trascurabile" : row.peso}</span>
        </span>
        <span className="max-w-[40%] shrink-0 text-right text-[15px] font-semibold">{row.costo}</span>
        <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
      </Link>
    </li>
  );
}

/**
 * Tools of both editions, grouped, searchable by name. The rule texts (competence, group texts)
 * arrive already rendered from the server, so they are not part of the browser code.
 */
export function ToolsBrowser({ rows, intro, groupTexts }: {
  rows: Record<EquipmentEdition, ToolListRow[]>;
  intro: Record<EquipmentEdition, ReactNode>;
  groupTexts: Record<EquipmentEdition, Partial<Record<string, ReactNode>>>;
}) {
  const [edition, setEdition] = useEquipmentEdition("strumenti");
  const [query, setQuery] = useState("");
  const [missing, setMissing] = useState<EquipmentEdition>();
  useEffect(() => {
    const url = new URL(window.location.href);
    const value = url.searchParams.get("manca");
    if (value !== "2014" && value !== "2024") return;
    setMissing(value);
    url.searchParams.delete("manca");
    window.history.replaceState(window.history.state, "", url);
  }, []);
  const needle = normalizeSearch(query);
  const items = rows[edition];
  // Typos tolerated (lib/fuzzy-search.ts): the exact names first in each group, then the similar ones.
  const settled = useSettledQuery(query);
  const result = useMemo(() => searchList(items, query, row => namesOf(row.nome, row.en), { settled }), [items, query, settled]);
  const found = useMemo(() => [...result.exact, ...result.approximate], [result]);
  return (
    <div className="px-4 pb-8 pt-4 sm:px-6">
      <ParentLink href="/equipaggiamento" label="Equipaggiamento" />
      <div className="flex items-center justify-between gap-3 border-b-4 border-primary pb-3">
        <h1 className="min-w-0 font-serif text-[40px] font-bold leading-tight">Strumenti</h1>
        <SectionEditionPill section="strumenti" edition={edition} choose={value => { setEdition(value); setMissing(undefined); }} />
      </div>
      <p className="mt-3 text-[15px] text-muted">{items.length} strumenti · {edition === "2024" ? "SRD 5.2.1" : "SRD 5.1"}</p>
      {missing && <p role="status" className="mt-3 rounded-xl border border-primary/40 bg-card px-4 py-2.5 text-[15px] font-semibold text-primary">Questo strumento non c’è nel {missing}.</p>}
      <div className="mt-3">{intro[edition]}</div>
      <ListSearch label="Cerca uno strumento" placeholder="Cerca: liuto, scasso…" value={query} onChange={setQuery} />
      <p role="status" className="mt-2 text-sm text-muted">{found.length === items.length ? "" : `${found.length} ${found.length === 1 ? "strumento trovato" : "strumenti trovati"}`}</p>
      {result.suggestion && <DidYouMean name={result.suggestion.nome} onPick={setQuery} className="mt-2" />}
      {found.length === 0 && <p className="mt-3 text-[15px]">Nessuno strumento con questo nome.</p>}
      <div className="mt-2 space-y-5">
        {GROUPS[edition].map(([key, title]) => {
          const group = found.filter(row => row.gruppo === key);
          if (!group.length) return null;
          return (
            <section key={key} aria-labelledby={`gruppo-${key}`}>
              <h2 id={`gruppo-${key}`} className="border-b-2 border-primary px-0.5 pb-1.5 font-serif text-[22px] font-bold text-primary">{title}</h2>
              {!needle && groupTexts[edition][key]}
              <ul className="overflow-hidden rounded-b-[14px] border border-t-0 border-border bg-card">
                {group.map(row => <ToolRow key={row.href} row={row} edition={edition} english={englishShown(row.nome, row.en, query, { settled })} />)}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
