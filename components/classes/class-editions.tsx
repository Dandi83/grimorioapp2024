"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { useEquipmentEdition } from "@/components/equipment/use-equipment-edition";
import type { ClassEdition } from "@/lib/classes-types";

const EDITIONS = ["2024", "2014"] as const;

/** «2024 · 2014»: the edition shown in the Classi pages, remembered like the rest of the Compendio. */
function EditionToggle({ shown, choose, compact }: { shown: ClassEdition; choose: (value: ClassEdition) => void; compact?: boolean }) {
  return (
    <div role="group" aria-label="Edizione delle regole" className={`flex shrink-0 rounded-[10px] border border-border bg-elevated p-1 ${compact ? "w-[132px]" : "mx-auto w-full max-w-[260px]"}`}>
      {EDITIONS.map(value => (
        <button key={value} type="button" aria-pressed={shown === value} onClick={() => choose(value)}
          className={`min-h-11 flex-1 rounded-[7px] text-base font-bold tabular-nums ${shown === value ? "bg-primary text-primary-foreground" : "text-muted"}`}>
          {value}
        </button>
      ))}
    </div>
  );
}

/** List page: the title with the selector on the same row, then the panel of the chosen edition. */
export function ClassListEditions({ title, panels }: { title: ReactNode; panels: Record<ClassEdition, ReactNode> }) {
  const [edition, setEdition] = useEquipmentEdition();
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        {title}
        <EditionToggle shown={edition} choose={setEdition} compact />
      </div>
      {EDITIONS.map(value => <div key={value} hidden={value !== edition} data-edition={value}>{panels[value]}</div>)}
    </>
  );
}

/**
 * Sheet of a class: the coloured header of the chosen edition (with its h1, read by «Segnala»),
 * the selector, then the body. Both editions sit in the page, so the switch also works offline.
 */
export function ClassSheetEditions({ headers, bodies }: { headers: Record<ClassEdition, ReactNode>; bodies: Record<ClassEdition, ReactNode> }) {
  const [edition, setEdition] = useEquipmentEdition();
  return (
    <>
      {EDITIONS.map(value => <div key={value} hidden={value !== edition} data-edition={value}>{headers[value]}</div>)}
      <div className="px-4 pt-4 sm:px-6"><EditionToggle shown={edition} choose={setEdition} /></div>
      {EDITIONS.map(value => <div key={value} hidden={value !== edition}>{bodies[value]}</div>)}
    </>
  );
}

/** «Privilegi · Tabella · Sottoclasse»: a segmented control over panels rendered by the server. */
export function ClassTabs({ tabs, label, idPrefix }: { tabs: { key: string; label: string; content: ReactNode }[]; label: string; idPrefix: string }) {
  const [active, setActive] = useState(tabs[0].key);
  const root = useRef<HTMLDivElement>(null);
  const keys = tabs.map(tab => tab.key).join(" ");
  // «#sottoclasse» in the address (a subclass found by the search) opens that tab.
  useEffect(() => {
    const open = () => {
      const key = window.location.hash.slice(1);
      if (!keys.split(" ").includes(key) || root.current?.closest("[hidden]")) return;
      setActive(key);
      root.current?.scrollIntoView({ block: "start" });
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [keys]);
  return (
    <div ref={root} className="scroll-mt-4">
      <div role="tablist" aria-label={label} className="flex rounded-[12px] bg-[#EDE3CC] p-1">
        {tabs.map(tab => (
          <button key={tab.key} type="button" role="tab" id={`${idPrefix}-${tab.key}-tab`} aria-controls={`${idPrefix}-${tab.key}`} aria-selected={active === tab.key} onClick={() => setActive(tab.key)}
            className={`min-h-11 flex-1 rounded-[9px] px-1 text-[15px] font-bold ${active === tab.key ? "bg-card text-primary shadow-[0_1px_2px_rgba(43,33,24,0.15)]" : "text-muted"}`}>
            {tab.label}
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
