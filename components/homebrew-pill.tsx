import { FlaskConical } from "lucide-react";

/** «Homebrew»: amber, unlike the SRD labels, on lists, search results, favorites and the sheet. */
export function HomebrewPill({ className = "" }: { className?: string }) {
  return (
    <span data-homebrew-pill="" className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#E0A21A] bg-[#F6E3B0] px-2 py-px align-middle text-[12px] font-bold leading-4 text-[#5C3F00] ${className}`}>
      <FlaskConical size={11} strokeWidth={2.2} aria-hidden="true" />Homebrew
    </span>
  );
}

/** A homebrew written for both editions: listed in 2014 and in 2024. */
export function BothEditionsPill({ className = "" }: { className?: string }) {
  return <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-2 py-px align-middle text-[12px] font-semibold leading-4 text-muted ${className}`}>2014 e 2024</span>;
}
