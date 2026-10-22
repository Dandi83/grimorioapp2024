"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useEquipmentEdition } from "@/components/equipment/use-equipment-edition";
import { EditionButtons, useEditions } from "@/components/sections/parts-context";
import type { EquipmentEdition } from "@/lib/equipment-types";

const EDITIONS = ["2024", "2014"] as const;

/**
 * Edition selector of a tool sheet. Both editions of a tool with the same name sit in the page (also
 * offline); otherwise the selector goes to the other edition's sheet (a 2014 instrument → the 2024
 * "Strumento musicale"), or back to the list with a short notice.
 * section: an edition hidden there (/admin/sezioni) has no button (the page leaves out its panel).
 */
export function ToolEditionPanels({ section, panels, hrefs, current, listHref, note }: {
  section: string;
  panels: Partial<Record<EquipmentEdition, ReactNode>>;
  /** Sheet of each edition, when it is another page. */
  hrefs: Partial<Record<EquipmentEdition, string>>;
  current: string;
  listHref: string;
  /** Note under the selector for a tool in one edition only. */
  note?: ReactNode;
}) {
  const router = useRouter();
  const [edition, setEdition] = useEquipmentEdition(section);
  const { selector } = useEditions(section);
  const only = panels["2014"] && panels["2024"] ? undefined : panels["2014"] ? "2014" : "2024";
  const shown: EquipmentEdition = only ?? edition;
  const choose = (value: EquipmentEdition) => {
    if (value === shown) return;
    setEdition(value);
    const href = hrefs[value];
    if (href && href !== current) router.push(href);
    else if (!panels[value]) router.push(`${listHref}?manca=${value}`);
  };
  return (
    <>
      <EditionButtons section={section} edition={shown} choose={choose} className="mx-auto mt-1 flex w-full max-w-[260px] rounded-[10px] border border-border bg-elevated p-1"
        button={active => `min-h-11 flex-1 rounded-[7px] text-base font-bold tabular-nums ${active ? "bg-primary text-primary-foreground" : "text-muted"}`} />
      {only && selector && (
        <div role="note" className="mt-3 rounded-xl border border-border bg-card px-4 py-2.5 text-center text-[15px] font-semibold text-muted">{note ?? `Solo edizione ${only}`}</div>
      )}
      {EDITIONS.map(value => panels[value] ? (
        <div key={value} hidden={value !== shown} data-edition={value}>{panels[value]}</div>
      ) : null)}
    </>
  );
}
