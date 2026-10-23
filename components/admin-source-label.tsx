/**
 * Where a card of the admin lists comes from, the same in both editions: «SRD 5.1», «SRD 5.2.1» (official
 * cards: no delete, fixed edition), «Sintesi originale», «Aggiunta da te».
 */
export function SourceLabel({ origine }: { origine: string }) {
  return <span data-source-label="">{origine}</span>;
}
