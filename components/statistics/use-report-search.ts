"use client";

import { useEffect, useRef } from "react";

/**
 * A search for the statistics: once the visitor stops typing for 1.5 s, the word and how many results it gave go to
 * the statistics provider (components/analytics-provider.tsx), which sends it only with the consent. Each word once
 * per page; the server keeps only letters, numbers, spaces and apostrophes (lib/analytics-stats.ts).
 */
export function useReportSearch(query: string, results: number, ready = true) {
  const sent = useRef(new Set<string>());
  useEffect(() => {
    const word = query.trim().toLowerCase().replace(/\s+/g, " ");
    if (!ready || word.length < 2 || sent.current.has(word)) return;
    const timer = window.setTimeout(() => {
      sent.current.add(word);
      window.dispatchEvent(new CustomEvent("grimorio:analytics-event", { detail: { event: "search", query: word, results } }));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [query, results, ready]);
}
