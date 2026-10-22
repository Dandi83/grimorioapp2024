"use client";

import { createContext, useContext, type ReactNode } from "react";

import { HiddenTag } from "@/components/sections/hidden-tag";
import { EDITIONS, partId, type Edition } from "@/lib/public-sections";

/** Parts hidden from the public (/admin/sezioni) and whether the viewer is the administrator: from the root layout. */
const PartsContext = createContext<{ hidden: readonly string[]; admin: boolean }>({ hidden: [], admin: false });

export function PartsProvider({ hidden, admin, children }: { hidden: readonly string[]; admin: boolean; children: ReactNode }) {
  return <PartsContext.Provider value={{ hidden, admin }}>{children}</PartsContext.Provider>;
}

/** A part: drawn for everyone, or only for the administrator with the «Nascosta» label. */
export function usePart(section: string, part: string): { shown: boolean; hidden: boolean } {
  const { hidden, admin } = useContext(PartsContext);
  const off = hidden.includes(partId(section, part));
  return { shown: !off || admin, hidden: off };
}

/**
 * The editions of a section that this page offers: the hidden one only to the administrator
 * (labelled). With a single edition left the 2024 · 2014 selector is not drawn.
 */
export function useEditions(section: string): { editions: { value: Edition; hidden: boolean }[]; allowed: Edition[]; selector: boolean } {
  const { hidden, admin } = useContext(PartsContext);
  const editions = EDITIONS.map(value => ({ value, hidden: hidden.includes(partId(section, value)) })).filter(edition => admin || !edition.hidden);
  const allowed = editions.length ? editions.map(edition => edition.value) : [...EDITIONS];
  return { editions, allowed, selector: editions.length > 1 };
}

/**
 * The 2024 · 2014 buttons of a page (each page keeps its own look through the classes): only the
 * editions offered, none when one is left; the administrator sees a hidden edition labelled.
 */
export function EditionButtons({ section, edition, choose, className, button }: {
  section: string;
  edition: Edition;
  choose: (value: Edition) => void;
  className: string;
  button: (active: boolean) => string;
}) {
  const { editions, selector } = useEditions(section);
  if (!selector) return null;
  return (
    <div role="group" aria-label="Edizione delle regole" className={className}>
      {editions.map(({ value, hidden }) => (
        <button key={value} type="button" data-part={partId(section, value)} aria-pressed={edition === value} onClick={() => choose(value)} className={button(edition === value)}>
          {value}{hidden && <HiddenTag className="ml-1" />}
        </button>
      ))}
    </div>
  );
}
