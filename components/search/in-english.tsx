import type { EnglishShown } from "@/lib/english-match";
import { Marked } from "@/components/search/marked";

/** «in inglese: Fire Bolt» under the Italian name, the letters found marked like the Italian name (PROMPT 33, 35). */
export function InEnglish({ shown, className = "" }: { shown?: EnglishShown; className?: string }) {
  if (!shown) return null;
  return (
    <span className={`block text-[14px] leading-snug text-muted ${className}`} data-in-inglese="">
      in inglese: <span lang="en"><Marked text={shown.name} start={shown.start} length={shown.length} /></span>
    </span>
  );
}
