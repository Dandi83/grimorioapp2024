import { BookOpen } from "lucide-react";

import type { CardSource } from "../lib/card-display";

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
