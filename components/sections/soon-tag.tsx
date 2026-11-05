import { TimbroPresto } from "@/components/pergamena/pergamena";

/**
 * A section or part coming soon (/admin/sezioni «In arrivo»). Everyone sees the tilted «PRESTO» stamp (PROMPT 65);
 * testo: the labels for the administrator (bars and buttons of the reserved views) stay «In arrivo», amber #E0A21A
 * with text #2B2118, as in /admin/sezioni.
 */
export function SoonTag({ className = "", testo = false }: { className?: string; testo?: boolean }) {
  if (!testo) return <TimbroPresto className={className} />;
  return <span data-soon-tag="" className={`inline-block rounded-[6px] bg-[#E0A21A] px-1.5 align-middle text-[12px] font-bold leading-4 text-[#2B2118] ${className}`}>In arrivo</span>;
}
