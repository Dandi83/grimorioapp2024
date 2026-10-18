import { BookOpen } from "lucide-react";

export function RulesEditionBadge({ edition, compact = false }: { edition?: "2014" | "2024"; compact?: boolean }) {
  if (!edition) return null;
  const description = `Edizione delle regole: D&D5e ${edition}. Questa etichetta non attesta una licenza.`;
  const sizeClass = compact
    ? "shrink-0 gap-1 px-1.5 py-0.5 leading-3.5"
    : "mt-1 gap-1.5 px-2.5 py-1 leading-4";
  return <span title={description} aria-label={description}
    className={`inline-flex items-center whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 text-[10px] font-medium text-primary ${sizeClass}`}>
    <BookOpen size={compact ? 10 : 12} className="shrink-0" aria-hidden="true" />
    <span>{`D&D5e ${edition}`}</span>
  </span>;
}
