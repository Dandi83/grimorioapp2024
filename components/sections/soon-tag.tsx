/** «In arrivo» next to a section or part coming soon (/admin/sezioni): amber #E0A21A, text #2B2118. Everyone sees it. */
export function SoonTag({ className = "" }: { className?: string }) {
  return <span data-soon-tag="" className={`inline-block rounded-[6px] bg-[#E0A21A] px-1.5 align-middle text-[12px] font-bold leading-4 text-[#2B2118] ${className}`}>In arrivo</span>;
}
