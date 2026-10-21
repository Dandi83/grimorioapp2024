"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useEquipmentEdition } from "@/components/equipment/use-equipment-edition";
import type { EquipmentEdition } from "@/lib/equipment-types";

const EDITIONS = ["2024", "2014"] as const;

/**
 * Edition selector of an adventuring gear sheet. Both editions of an object with the same name sit
 * in the page (also offline); an object with a different name in 2014 has its own address, so the
 * selector goes to the other sheet; an object missing in the chosen edition goes back to the list.
 */
export function GearEditionPanels({ panels, hrefs, fixed, listHref }: {
  panels: Partial<Record<EquipmentEdition, ReactNode>>;
  hrefs: Partial<Record<EquipmentEdition, string>>;
  /** Edition of an address that belongs to one edition only ("canestro" is 2014). */
  fixed?: EquipmentEdition;
  listHref: string;
}) {
  const router = useRouter();
  const [edition, setEdition] = useEquipmentEdition();
  const only = panels["2014"] && panels["2024"] ? undefined : panels["2014"] ? "2014" : "2024";
  const shown: EquipmentEdition = fixed ?? only ?? edition;
  const choose = (value: EquipmentEdition) => {
    if (value === shown) return;
    setEdition(value);
    if (!panels[value]) router.push(`${listHref}?manca=${value}`);
    else if (fixed && hrefs[value]) router.push(hrefs[value]!);
  };
  return (
    <>
      <div role="group" aria-label="Edizione delle regole" className="mx-auto mt-1 flex w-full max-w-[260px] rounded-[10px] border border-border bg-elevated p-1">
        {EDITIONS.map(value => (
          <button key={value} type="button" aria-pressed={shown === value} onClick={() => choose(value)}
            className={`min-h-11 flex-1 rounded-[7px] text-base font-bold tabular-nums ${shown === value ? "bg-primary text-primary-foreground" : "text-muted"}`}>
            {value}
          </button>
        ))}
      </div>
      {only && (
        <p role="note" className="mt-3 rounded-xl border border-border bg-card px-4 py-2.5 text-center text-[15px] font-semibold text-muted">Solo edizione {only}</p>
      )}
      {EDITIONS.map(value => panels[value] ? (
        <div key={value} hidden={value !== shown} data-edition={value}>{panels[value]}</div>
      ) : null)}
    </>
  );
}
