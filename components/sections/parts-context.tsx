"use client";

import Link from "next/link";
import { createContext, useContext, type ReactNode } from "react";

import { HiddenTag } from "@/components/sections/hidden-tag";
import { SoonTag } from "@/components/sections/soon-tag";
import { EDITIONS, partId, soonHref, type Edition } from "@/lib/public-sections";

/**
 * Parts hidden from the public (/admin/sezioni), those «In arrivo» among them (soon: part ids and section keys)
 * and whether the viewer is the administrator: from the root layout.
 */
const PartsContext = createContext<{ hidden: readonly string[]; admin: boolean; soon: readonly string[] }>({ hidden: [], admin: false, soon: [] });

export function PartsProvider({ hidden, admin, soon = [], children }: { hidden: readonly string[]; admin: boolean; soon?: readonly string[]; children: ReactNode }) {
  return <PartsContext.Provider value={{ hidden, admin, soon }}>{children}</PartsContext.Provider>;
}

/**
 * A part: drawn for everyone, or only for the administrator with the «Nascosta» label; soon: «In arrivo», the public
 * gets its entry (attenuated, to the «in costruzione» page) and never its content.
 */
export function usePart(section: string, part: string): { shown: boolean; hidden: boolean; soon: boolean } {
  const { hidden, admin, soon } = useContext(PartsContext);
  const id = partId(section, part);
  const off = hidden.includes(id);
  return { shown: !off || admin, hidden: off, soon: soon.includes(id) };
}

/** The entry of a part «In arrivo» for the public: its name attenuated, the pill, to the «in costruzione» page. */
export function SoonEntry({ id, children, className = "" }: { id: string; children: ReactNode; className?: string }) {
  return (
    <Link href={soonHref(id)} prefetch={false} data-part={id} data-soon="" className={`opacity-60 ${className}`}>
      {children} <SoonTag className="ml-1" />
    </Link>
  );
}

/**
 * The editions of a section that this page offers: the hidden one only to the administrator
 * (labelled). With a single edition left the 2024 · 2014 selector is not drawn.
 */
export function useEditions(section: string): { editions: { value: Edition; hidden: boolean }[]; allowed: Edition[]; selector: boolean; soon: Edition[] } {
  const { hidden, admin, soon: coming } = useContext(PartsContext);
  const editions = EDITIONS.map(value => ({ value, hidden: hidden.includes(partId(section, value)) })).filter(edition => admin || !edition.hidden);
  const allowed = editions.length ? editions.map(edition => edition.value) : [...EDITIONS];
  // «In arrivo» for the public: offered as an entry to the «in costruzione» page, never as content.
  const soon = admin ? [] : EDITIONS.filter(value => coming.includes(partId(section, value)));
  return { editions, allowed, selector: editions.length + soon.length > 1, soon };
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
  const { editions, selector, soon } = useEditions(section);
  const { soon: coming, admin } = useContext(PartsContext);
  if (!selector) return null;
  return (
    <div role="group" aria-label="Edizione delle regole" className={className}>
      {EDITIONS.map(value => {
        const offered = editions.find(item => item.value === value);
        if (offered) {
          return (
            <button key={value} type="button" data-part={partId(section, value)} aria-pressed={edition === value} onClick={() => choose(value)} className={button(edition === value)}>
              {value}{offered.hidden && (admin && coming.includes(partId(section, value)) ? <SoonTag className="ml-1" /> : <HiddenTag className="ml-1" />)}
            </button>
          );
        }
        return soon.includes(value) ? <SoonEntry key={value} id={partId(section, value)} className={button(false)}>{value}</SoonEntry> : null;
      })}
    </div>
  );
}
