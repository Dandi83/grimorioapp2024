import { BookOpen } from "lucide-react";

/** "dark": the label of a sheet (only the year on a dark background, «5e» for screen readers; PROMPT 72: no «D&D»), as on the creature sheets. */
export function RulesEditionBadge({ edition, compact = false, variant = "pill" }: { edition?: "2014" | "2024"; compact?: boolean; variant?: "pill" | "dark" }) {
  if (!edition) return null;
  const description = `Edizione delle regole: 5e ${edition}. Questa etichetta non attesta una licenza.`;
  if (variant === "dark") {
    return <span title={description} className="mt-1 inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[13px] font-bold leading-4 text-card">
      <BookOpen size={12} className="shrink-0" aria-hidden="true" />
      <span className="whitespace-nowrap"><span className="sr-only">5e </span>{edition}</span>
    </span>;
  }
  const sizeClass = compact
    ? "shrink-0 gap-1 px-1.5 py-0.5 leading-3.5"
    : "mt-1 gap-1.5 px-2.5 py-1 leading-4";
  return <span title={description} aria-label={description}
    className={`inline-flex items-center whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 text-[12px] font-semibold text-primary ${sizeClass}`}>
    <BookOpen size={compact ? 10 : 12} className="shrink-0" aria-hidden="true" />
    <span>{`5e ${edition}`}</span>
  </span>;
}
