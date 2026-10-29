import Link from "next/link";
import { PenLine } from "lucide-react";

/**
 * The original creatures (PROMPT 13, renamed with PROMPT 25), on lists, search results, Preferiti and the sheet:
 * «✎ Dalla community» (amber, with the pen) for the creatures of the community, «Dalla redazione» (bordeaux) for ours
 * (no author).
 */
export function HomebrewPill({ ours = false, className = "" }: { ours?: boolean; className?: string }) {
  if (ours) {
    return (
      <span data-homebrew-pill="grimorio" className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[#7A1F2B] px-2 py-px align-middle text-[12px] font-bold leading-4 text-[#FFFBF0] ${className}`}>
        Dalla redazione
      </span>
    );
  }
  return (
    <span data-homebrew-pill="community" className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#E0A21A] bg-[#F6E3B0] px-2 py-px align-middle text-[12px] font-bold leading-4 text-[#5C3F00] ${className}`}>
      <PenLine size={11} strokeWidth={2.2} aria-hidden="true" />Dalla community
    </span>
  );
}

/** A homebrew written for both editions: listed in 2014 and in 2024. */
export function BothEditionsPill({ className = "" }: { className?: string }) {
  return <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-2 py-px align-middle text-[12px] font-semibold leading-4 text-muted ${className}`}>2014 e 2024</span>;
}

/**
 * «✓ Bilanciamento verificato ›» (PROMPT 19): beside the pill of a card whose verdict saved at the approval was
 * «In linea» (and the administrator left it on); it leads to the page of the method. Never a number of the simulator.
 */
export function VerifiedPill() {
  return (
    <Link href="/bestiario/creati-da-voi/bilanciamento" data-verified-pill=""
      className="inline-flex min-h-6 shrink-0 items-center whitespace-nowrap rounded-full border border-[#9CC5AE] bg-[#E3F0E8] px-2 py-px align-middle text-[12px] font-bold leading-4 text-[#1F6B45]">
      ✓ Bilanciamento verificato ›
    </Link>
  );
}
