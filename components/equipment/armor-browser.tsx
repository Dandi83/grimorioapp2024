"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminEditPencil } from "@/components/admin-edit/admin-edit-button";
import { ChevronRight } from "lucide-react";

import { CatalogTitle } from "@/components/catalog-ui";
import { ListSearch } from "@/components/equipment/list-search";
import { FoundName } from "@/components/search/found-name";
import { InEnglish } from "@/components/search/in-english";
import { DidYouMean, useSettledQuery } from "@/components/search/did-you-mean";
import { useReportSearch } from "@/components/statistics/use-report-search";
import { englishShown, namesOf } from "@/lib/english-match";
import { normalizeSearch, searchList } from "@/lib/fuzzy-search";
import { ParentLink } from "@/components/section-tiles";
import { ArmorBadge, ArmorChips } from "@/components/equipment/armor-badge";
import { useEquipmentEdition } from "@/components/equipment/use-equipment-edition";
import { ARMOR_CATEGORY_TITLES, type ArmorListItem, type ArmorTimes } from "@/lib/equipment-types";

/** Armor of both editions, grouped by category with the time to don and doff. */
export function ArmorBrowser({ items, times, sameNumbers }: { items: ArmorListItem[]; times: ArmorTimes; sameNumbers: boolean }) {
  const [edition, setEdition] = useEquipmentEdition("armature");
  // The search (PROMPT 36): Italian and English names, typos tolerated (lib/fuzzy-search.ts), best first in each category.
  const [query, setQuery] = useState("");
  const settled = useSettledQuery(query);
  const result = useMemo(() => searchList(items, query, item => namesOf(item.editions[edition].nome, item.editions[edition].en), { groupOf: item => item.categoria, settled }), [items, query, edition, settled]);
  const found = useMemo(() => [...result.exact, ...result.approximate], [result]);
  const searching = normalizeSearch(query) !== "";
  useReportSearch(query, result.exact.length, true, "armature");
  return (
    <div className="px-4 pb-8 pt-4 sm:px-6">
      <ParentLink href="/equipaggiamento" label="Equipaggiamento" />
      <CatalogTitle section="armature" title="Armature" edition={edition} onEdition={setEdition} />
      <p className="mt-2 text-[15px] text-muted">
        {items.length} voci · {edition === "2024" ? "SRD 5.2.1" : "SRD 5.1"}
        {sameNumbers && <><br />Stesse CA, pesi e costi in entrambe le edizioni</>}
      </p>
      <ListSearch label="Cerca un’armatura" value={query} onChange={setQuery} />
      <p role="status" className="mt-2 text-sm text-muted">{searching ? `${found.length} ${found.length === 1 ? "armatura trovata" : "armature trovate"}` : ""}</p>
      {result.suggestion && <DidYouMean name={result.suggestion.editions[edition].nome} onPick={setQuery} className="mt-2" />}
      {searching && found.length === 0 && <p className="mt-3 text-[15px]">Nessuna armatura con questo nome.</p>}
      <div className="mt-4 space-y-5">
        {ARMOR_CATEGORY_TITLES.map((title, category) => {
          const rows = found.filter(item => item.categoria === category);
          // While searching, the categories with no armour found are left out.
          if (searching && !rows.length) return null;
          return (
            <section key={title} aria-labelledby={`categoria-${category}`}>
              <div className="border-b-2 border-primary px-0.5 pb-1.5 pt-1">
                <h2 id={`categoria-${category}`} className="font-serif text-[22px] font-bold text-primary">{title}</h2>
                <p className="text-sm text-muted">{times[edition][category]}</p>
              </div>
              <ul className="overflow-hidden rounded-b-[14px] border border-t-0 border-border bg-card">
                {rows.map(item => {
                  const armor = item.editions[edition];
                  return (
                    <li key={item.id} className="flex items-center border-b border-divider last:border-b-0">
                      {/* Administrator only: the pencil next to the name opens its card in /admin/contenuti. */}
                      <AdminEditPencil target={{ kind: "contenuto", section: "armature", id: item.id, edition }} name={armor.nome} />
                      <Link href={`/equipaggiamento/armature/${item.id}`} prefetch={false} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-3 py-2.5">
                        <ArmorBadge ca={armor.ca} note={armor.caNote} />
                        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <span>
                            <span className="block font-serif text-xl font-bold leading-tight"><FoundName name={armor.nome} query={query} settled={settled} /></span>
                            <InEnglish shown={englishShown(armor.nome, armor.en, query, { settled })} className="mt-0.5" />
                          </span>
                          <ArmorChips chips={armor.chips} />
                        </span>
                        <span className="shrink-0 text-right text-[14px] leading-5">
                          <span className="block font-semibold">{armor.costo}</span>
                          <span className="block text-muted">{armor.peso}</span>
                        </span>
                        <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
