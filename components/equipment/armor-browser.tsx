"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { CatalogTitle } from "@/components/catalog-ui";
import { ParentLink } from "@/components/section-tiles";
import { ArmorBadge, ArmorChips } from "@/components/equipment/armor-badge";
import { useEquipmentEdition } from "@/components/equipment/use-equipment-edition";
import { ARMOR_CATEGORY_TITLES, type ArmorListItem, type ArmorTimes } from "@/lib/equipment-types";

/** Armor of both editions, grouped by category with the time to don and doff. */
export function ArmorBrowser({ items, times, sameNumbers }: { items: ArmorListItem[]; times: ArmorTimes; sameNumbers: boolean }) {
  const [edition, setEdition] = useEquipmentEdition();
  return (
    <div className="px-4 pb-8 pt-4 sm:px-6">
      <ParentLink href="/equipaggiamento" label="Equipaggiamento" />
      <CatalogTitle title="Armature" edition={edition} onEdition={setEdition} />
      <p className="mt-2 text-[15px] text-muted">
        {items.length} voci · {edition === "2024" ? "SRD 5.2.1" : "SRD 5.1"}
        {sameNumbers && <><br />Stesse CA, pesi e costi in entrambe le edizioni</>}
      </p>
      <div className="mt-4 space-y-5">
        {ARMOR_CATEGORY_TITLES.map((title, category) => {
          const rows = items.filter(item => item.categoria === category);
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
                    <li key={item.id} className="border-b border-divider last:border-b-0">
                      <Link href={`/equipaggiamento/armature/${item.id}`} prefetch={false} className="flex min-h-16 items-center gap-3 px-3 py-2.5">
                        <ArmorBadge ca={armor.ca} note={armor.caNote} />
                        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <span className="font-serif text-xl font-bold leading-tight">{armor.nome}</span>
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
