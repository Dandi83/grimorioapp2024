"use client";

import type { ReactNode } from "react";
import { useEquipmentEdition } from "@/components/equipment/use-equipment-edition";
import { EditionButtons } from "@/components/sections/parts-context";
import type { EquipmentEdition } from "@/lib/equipment-types";

/**
 * Both editions are in the page (also offline); the 2024 | 2014 selector shows one.
 * An item printed in only one edition says so and shows the edition it has.
 * section: its hidden edition (/admin/sezioni) gets no button and its panel is not in the page.
 */
export function EditionPanels({ section, panels, missing }: {
  section: string;
  panels: Partial<Record<EquipmentEdition, ReactNode>>;
  missing: Partial<Record<EquipmentEdition, string>>;
}) {
  const [edition, setEdition] = useEquipmentEdition(section);
  const shown: EquipmentEdition = panels[edition] ? edition : edition === "2024" ? "2014" : "2024";
  return (
    <>
      <EditionButtons section={section} edition={edition} choose={setEdition} className="mx-auto mt-1 flex w-full max-w-[260px] rounded-[10px] border border-border bg-elevated p-1"
        button={active => `min-h-11 flex-1 rounded-[7px] text-base font-bold tabular-nums ${active ? "bg-primary text-primary-foreground" : "text-muted"}`} />
      {!panels[edition] && missing[edition] && (
        <p role="status" className="mt-3 rounded-xl border border-primary/40 bg-card px-4 py-3 text-center text-[15px] font-semibold text-primary">
          {missing[edition]}: dati dell’edizione {shown}.
        </p>
      )}
      {(["2024", "2014"] as const).map(value => panels[value] ? (
        <div key={value} hidden={value !== shown} data-edition={value}>{panels[value]}</div>
      ) : null)}
    </>
  );
}
