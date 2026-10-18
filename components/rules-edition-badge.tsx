export function RulesEditionBadge({ edition }: { edition?: "2014" | "2024" }) {
  if (!edition) return null;
  return <span title={`Edizione indicata dall’amministratore: D&D ${edition}. Questa etichetta non attesta una licenza.`}
    className="mt-1 inline-flex rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium leading-4 text-muted">
    D&amp;D {edition}
  </span>;
}
