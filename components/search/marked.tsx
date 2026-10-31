import { markRange } from "@/lib/highlight";

/**
 * A name with the letters found by the search marked (the Home search and the line «in inglese»): one style for every
 * name. start and length are on the searched form of the name (lib/fuzzy-search.ts); -1: nothing marked.
 */
export function Marked({ text, start, length }: { text: string; start: number; length: number }) {
  const range = markRange(text, start, length);
  if (!range) return <>{text}</>;
  return (
    <>
      {text.slice(0, range[0])}
      <mark className="rounded-[3px] bg-[#F6E2A8] font-bold text-primary">{text.slice(range[0], range[1])}</mark>
      {text.slice(range[1])}
    </>
  );
}
