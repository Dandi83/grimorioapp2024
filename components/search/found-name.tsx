import { Marked } from "@/components/search/marked";
import { nameMark } from "@/lib/highlight";

/**
 * The Italian name of a row of a list with the letters found marked (PROMPT 36, every list since PROMPT 38), as in
 * the search of the Home. mark: computed by the list (the long lists of Incantesimi and Bestiario, whose rows are
 * memoized); else from query. Nothing marked without a query, or when only a typo or the English name finds the row.
 */
export function FoundName({ name, query = "", settled = true, mark }: { name: string; query?: string; settled?: boolean; mark?: { start: number; length: number } | null }) {
  const found = mark !== undefined ? mark : nameMark(name, query, { settled });
  return found ? <Marked text={name} start={found.start} length={found.length} /> : <>{name}</>;
}
