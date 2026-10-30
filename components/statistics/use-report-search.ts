"use client";

import { useEffect, useRef } from "react";
import type { FilterGroup, SearchArea } from "@/lib/analytics-stats";

/**
 * A search for the statistics: once the visitor stops typing for 1.5 s, the word, how many results it gave and where
 * it was typed go to the statistics provider (components/analytics-provider.tsx), which sends it only with the
 * consent. Each word once per page; the server keeps only letters, numbers, spaces and apostrophes (lib/analytics-stats.ts).
 */
export function useReportSearch(query: string, results: number, ready = true, area?: SearchArea) {
  const sent = useRef(new Set<string>());
  useEffect(() => {
    const word = query.trim().toLowerCase().replace(/\s+/g, " ");
    if (!ready || word.length < 2 || sent.current.has(word)) return;
    const timer = window.setTimeout(() => {
      sent.current.add(word);
      window.dispatchEvent(new CustomEvent("grimorio:analytics-event", { detail: { event: "search", query: word, results, area } }));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [query, results, ready, area]);
}

/** The groups of filters applied and not sent yet: they leave with the next page view or search (PROMPT 31). */
export const PENDING_FILTERS = "grimorio_statistics_filters";

/**
 * The filters of a list (only the names of their groups): kept on this tab, no request of their own. A group counts
 * when it is turned on, not at the first drawing of the page (filters read from the address).
 */
export function useReportFilters(active: FilterGroup[]) {
  const before = useRef<FilterGroup[] | null>(null);
  const key = active.join(",");
  useEffect(() => {
    const now = key ? (key.split(",") as FilterGroup[]) : [];
    const added = before.current === null ? [] : now.filter(group => !before.current!.includes(group));
    before.current = now;
    if (!added.length) return;
    try {
      const pending = JSON.parse(sessionStorage.getItem(PENDING_FILTERS) || "[]") as string[];
      sessionStorage.setItem(PENDING_FILTERS, JSON.stringify([...new Set([...pending, ...added])]));
    } catch { /* no storage: not counted */ }
  }, [key]);
}
