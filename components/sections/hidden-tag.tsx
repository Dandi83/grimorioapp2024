/** «Nascosta» next to a part hidden from the public: only the administrator sees it (/admin/sezioni). */
export function HiddenTag({ className = "" }: { className?: string }) {
  return <span className={`inline-block rounded-[6px] bg-[#2B2118] px-1.5 align-middle text-[12px] font-bold leading-4 text-[#E0A21A] ${className}`}>Nascosta</span>;
}
