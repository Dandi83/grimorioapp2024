import { Marked } from "@/components/search/marked";
import { nameMark } from "@/lib/highlight";

/** The Italian name of a row of Armi and Armature with the letters found marked (PROMPT 36), as in the search of the Home. */
export function FoundName({ name, query, settled }: { name: string; query: string; settled: boolean }) {
  const mark = nameMark(name, query, { settled });
  return mark ? <Marked text={name} start={mark.start} length={mark.length} /> : <>{name}</>;
}
