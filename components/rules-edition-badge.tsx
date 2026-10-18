export function RulesEditionBadge({ edition, compact = false }: { edition?: "2014" | "2024"; compact?: boolean }) {
  if (!edition && !compact) return null;
  const description = edition
    ? `Edizione delle regole: D&D ${edition}. Questa etichetta non attesta una licenza.`
    : "Edizione delle regole non verificata per questa scheda.";
  const sizeClass = compact
    ? "shrink-0 px-1.5 py-0.5 leading-3.5"
    : "mt-1 px-2.5 py-1 leading-4";
  return <span title={description} aria-label={description}
    className={`inline-flex whitespace-nowrap rounded-full border text-[10px] font-medium ${sizeClass} ${edition ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card text-muted"}`}>
    {edition ? `D&D ${edition}` : "Da verificare"}
  </span>;
}
