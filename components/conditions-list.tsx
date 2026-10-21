"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { useEquipmentEdition } from "@/components/equipment/use-equipment-edition";
import { ParentLink } from "@/components/section-tiles";
import type { ConditionRow } from "@/lib/conditions-list";
import type { EquipmentEdition } from "@/lib/equipment-types";

/** Conditions of the chosen edition (the choice of the other Compendio sections, remembered on the phone). */
export function ConditionsList({ rows }: { rows: Record<EquipmentEdition, ConditionRow[]> }) {
  const [edition, setEdition] = useEquipmentEdition();
  const list = rows[edition];
  return (
    <div className="px-4 pb-8 pt-4 sm:px-6">
      <ParentLink href="/compendio" label="Compendio" />
      <h1 className="border-b-4 border-primary pb-3 font-serif text-[40px] font-bold leading-tight">Condizioni</h1>
      <div role="group" aria-label="Edizione delle regole" className="mt-4 flex rounded-[12px] bg-elevated p-1">
        {(["2014", "2024"] as const).map(value => (
          <button key={value} type="button" aria-pressed={edition === value} onClick={() => setEdition(value)}
            className={`min-h-11 flex-1 rounded-[9px] text-base font-bold tabular-nums ${edition === value ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
            {value}
          </button>
        ))}
      </div>
      {list.length ? (
        <ul className="mt-4 overflow-hidden rounded-[14px] border-[1.5px] border-border bg-card" aria-label={`Condizioni ${edition}`}>
          {list.map(row => (
            <li key={row.href} className="border-t border-divider first:border-t-0">
              <Link href={row.href} prefetch={false} className="flex min-h-11 items-center gap-2.5 px-3.5 py-1.5">
                <span className="min-w-0 flex-1 text-base font-semibold text-primary">{row.nome}</span>
                <ChevronRight size={16} strokeWidth={2.4} className="shrink-0 text-[#B9A57C]" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p role="status" className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-[15px]">Questa edizione non è ancora disponibile</p>
      )}
    </div>
  );
}
