"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { useEquipmentEdition } from "@/components/equipment/use-equipment-edition";
import { HiddenTag } from "@/components/sections/hidden-tag";
import { EditionButtons } from "@/components/sections/parts-context";
import type { ClassEdition } from "@/lib/classes-types";

const EDITIONS = ["2024", "2014"] as const;

/**
 * «2024 · 2014»: the edition shown in the Classi pages, remembered like the rest of the Compendio.
 * An edition hidden from /admin/sezioni has no button (and no panel in the page).
 */
function EditionToggle({ shown, choose, compact }: { shown: ClassEdition; choose: (value: ClassEdition) => void; compact?: boolean }) {
  return (
    <EditionButtons section="classi" edition={shown} choose={choose} className={`flex shrink-0 rounded-[10px] border border-border bg-elevated p-1 ${compact ? "min-w-[132px]" : "mx-auto w-full max-w-[260px]"}`}
      button={active => `min-h-11 flex-1 rounded-[7px] px-1 text-base font-bold tabular-nums ${active ? "bg-primary text-primary-foreground" : "text-muted"}`} />
  );
}

/** List page: the title with the selector on the same row, then the panel of the chosen edition. */
export function ClassListEditions({ title, panels }: { title: ReactNode; panels: Partial<Record<ClassEdition, ReactNode>> }) {
  const [edition, setEdition] = useEquipmentEdition("classi");
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        {title}
        <EditionToggle shown={edition} choose={setEdition} compact />
      </div>
      {EDITIONS.map(value => panels[value] ? <div key={value} hidden={value !== edition} data-edition={value}>{panels[value]}</div> : null)}
    </>
  );
}

/**
 * Sheet of a class: the coloured header of the chosen edition (with its h1, read by «Segnala»),
 * the selector, then the body. Both editions sit in the page, so the switch also works offline.
 */
export function ClassSheetEditions({ headers, bodies }: { headers: Partial<Record<ClassEdition, ReactNode>>; bodies: Partial<Record<ClassEdition, ReactNode>> }) {
  const [edition, setEdition] = useEquipmentEdition("classi");
  const editions = EDITIONS.filter(value => headers[value]);
  return (
    <>
      {editions.map(value => <div key={value} hidden={value !== edition} data-edition={value}>{headers[value]}</div>)}
      {editions.length > 1 && <div className="px-4 pt-4 sm:px-6"><EditionToggle shown={edition} choose={setEdition} /></div>}
      {editions.map(value => <div key={value} hidden={value !== edition}>{bodies[value]}</div>)}
    </>
  );
}

/** «Privilegi · Tabella · Sottoclasse»: a segmented control over panels rendered by the server. */
/** A tab hidden from /admin/sezioni is left out by the server; the administrator sees it with «Nascosta». */
export function ClassTabs({ tabs, label, idPrefix }: { tabs: { key: string; label: string; content: ReactNode; part?: string; hidden?: boolean }[]; label: string; idPrefix: string }) {
  const [active, setActive] = useState(tabs[0].key);
  const root = useRef<HTMLDivElement>(null);
  const keys = tabs.map(tab => tab.key).join(" ");
  // «#sottoclasse» in the address (a subclass found by the search) opens that tab.
  useEffect(() => {
    const open = () => {
      const key = window.location.hash.slice(1);
      if (!keys.split(" ").includes(key)) return;
      // Both editions open the tab; the one shown (chosen just after mount) scrolls into view.
      setActive(key);
      window.setTimeout(() => { if (!root.current?.closest("[hidden]")) root.current?.scrollIntoView({ block: "start" }); }, 80);
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [keys]);
  return (
    <div ref={root} className="scroll-mt-4">
      <div role="tablist" aria-label={label} className="flex rounded-[12px] bg-[#EDE3CC] p-1">
        {tabs.map(tab => (
          <button key={tab.key} type="button" role="tab" data-part={tab.part} id={`${idPrefix}-${tab.key}-tab`} aria-controls={`${idPrefix}-${tab.key}`} aria-selected={active === tab.key} onClick={() => setActive(tab.key)}
            className={`min-h-11 min-w-0 flex-1 rounded-[9px] px-1 text-[15px] font-bold ${active === tab.key ? "bg-card text-primary shadow-[0_1px_2px_rgba(43,33,24,0.15)]" : "text-muted"}`}>
            {tab.label}{tab.hidden && <HiddenTag className="ml-1" />}
          </button>
        ))}
      </div>
      {tabs.map(tab => (
        <div key={tab.key} role="tabpanel" id={`${idPrefix}-${tab.key}`} aria-labelledby={`${idPrefix}-${tab.key}-tab`} hidden={active !== tab.key} className="mt-4">
          {tab.content}
        </div>
      ))}
    </div>
  );
}
