/** «in inglese: Bless» under the Italian name of a result found by its official English name (PROMPT 33). */
export function InEnglish({ name, className = "" }: { name?: string; className?: string }) {
  if (!name) return null;
  return <span className={`block text-[14px] leading-snug text-muted ${className}`} data-in-inglese="">in inglese: <span lang="en">{name}</span></span>;
}
