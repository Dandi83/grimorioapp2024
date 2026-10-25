import { BookOpen } from "lucide-react";

import type { CardSource } from "../lib/card-display";

/** «Fonti e licenze», section «Schede NO SRD» (app/fonti/page.tsx). */
export const NO_SRD_HREF = "/fonti#no-srd";

/** The pill of a card label («Concentrazione», «Rituale», the source). */
export const LABEL_PILL = "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-4";

/**
 * The sources shown only to the administrator (and in the reserved area): the public pages, their cached HTML
 * and offline copies name them only by a code; the visitor has the asterisk and «Fonti e licenze» instead.
 */
export const ADMIN_ONLY_SOURCES = { aggiunta: "Aggiunta da te", sintesi: "Sintesi originale" } as const satisfies Record<string, CardSource>;
export type AdminOnlySource = keyof typeof ADMIN_ONLY_SOURCES;

export function adminOnlySource(source: CardSource | undefined): AdminOnlySource | undefined {
  return (Object.keys(ADMIN_ONLY_SOURCES) as AdminOnlySource[]).find(code => ADMIN_ONLY_SOURCES[code] === source);
}

/** Where the card comes from, with the book icon. */
export function SourcePill({ source }: { source: CardSource }) {
  return (
    <span className={`${LABEL_PILL} gap-1 border-border bg-card text-muted`} data-card-source={source}>
      <BookOpen size={11} className="shrink-0" aria-hidden="true" />{source}
    </span>
  );
}

/**
 * «NO SRD», for everyone to see: a card not transcribed from the SRD (a subclass, spell or creature added by the
 * administrator, an original summary of the 2024 rules). Next to it the administrator also sees where it comes from.
 */
export function NoSrdTag({ link = true }: { link?: boolean }) {
  const pill = "inline-flex shrink-0 items-center rounded-full bg-[#2B2118] px-2.5 py-1 align-middle text-[11px] font-bold leading-4 tracking-[0.04em] text-[#FFFBF0]";
  // A tap opens «Fonti e licenze» at «Schede NO SRD»; inside another link (admin lists) it is only the pill.
  if (!link) return <span data-no-srd="" className={pill}>NO SRD</span>;
  return (
    <a href={NO_SRD_HREF} data-no-srd="" title="Che cosa vuol dire: Fonti e licenze" aria-label="NO SRD: che cosa vuol dire, in Fonti e licenze"
      className={`${pill} min-h-6 underline-offset-2 hover:underline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber`}>NO SRD</a>
  );
}
