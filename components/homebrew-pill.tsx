import { PenLine } from "lucide-react";

/**
 * «I mostri creati da voi» (PROMPT 13), on lists, search results, Preferiti and the sheet: «Creato da voi» (amber,
 * with the pen) for the creatures of the community, «Creato dal Grimorio» (bordeaux) for ours (no author).
 */
export function HomebrewPill({ ours = false, className = "" }: { ours?: boolean; className?: string }) {
  if (ours) {
    return (
      <span data-homebrew-pill="grimorio" className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[#7A1F2B] px-2 py-px align-middle text-[12px] font-bold leading-4 text-[#FFFBF0] ${className}`}>
        Creato dal Grimorio
      </span>
    );
  }
  return (
    <span data-homebrew-pill="community" className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#E0A21A] bg-[#F6E3B0] px-2 py-px align-middle text-[12px] font-bold leading-4 text-[#5C3F00] ${className}`}>
      <PenLine size={11} strokeWidth={2.2} aria-hidden="true" />Creato da voi
    </span>
  );
}

/** A homebrew written for both editions: listed in 2014 and in 2024. */
export function BothEditionsPill({ className = "" }: { className?: string }) {
  return <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-2 py-px align-middle text-[12px] font-semibold leading-4 text-muted ${className}`}>2014 e 2024</span>;
}
