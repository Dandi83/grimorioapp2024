/**
 * Where a card of the admin lists comes from, the same in both editions: «SRD 5.1», «SRD 5.2.1» (official
 * cards: no delete, fixed edition), «Sintesi originale», «Aggiunta da te». A small pill: it goes to the next line
 * by itself when there is no room, so the level and the school are never cut.
 */
export function SourceLabel({ origine }: { origine: string }) {
  return <span data-source-label="" className="inline-block whitespace-nowrap rounded-full border border-border bg-background px-1.5 text-[11px] leading-4 text-muted-foreground">{origine}</span>;
}
