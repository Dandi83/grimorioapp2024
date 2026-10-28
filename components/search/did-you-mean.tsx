"use client";

import { useEffect } from "react";
import { prepareNames } from "@/lib/fuzzy-search";

/** Prepares the names of a searched list when the browser is idle, so the first keystroke is as quick as the next ones. */
export function usePreparedNames(names: () => Iterable<string>, ready: unknown) {
  useEffect(() => {
    if (!ready) return;
    const run = () => prepareNames(names());
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, 200);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prepared again only when the list changes
  }, [ready]);
}

/**
 * «Forse cercavi: Palla di fuoco» over a list searched with a typo (lib/fuzzy-search.ts): nothing matches exactly,
 * the closest name is one tap away and becomes the search.
 */
export function DidYouMean({ name, onPick, className = "" }: { name: string; onPick: (name: string) => void; className?: string }) {
  return (
    <p role="status" data-did-you-mean="" className={`rounded-xl border border-primary/40 bg-card px-4 py-1 text-[15px] text-foreground ${className}`}>
      Forse cercavi:{" "}
      <button type="button" onClick={() => onPick(name)} className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">
        {name}
      </button>
    </p>
  );
}

/** The heading over the approximate results of a list, always after the exact ones. */
export function SimilarResultsHeading({ className = "" }: { className?: string }) {
  return (
    <div className={`mb-1 mt-6 flex items-center gap-3 ${className}`} data-similar-results="">
      <h2 className="font-serif text-[22px] font-bold text-muted">Risultati simili</h2>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}
