"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";

import { fold } from "@/lib/search";
import { SEARCH_INPUT } from "@/lib/search-input";

export interface SearchEntry { name: string; kind: string; href: string }

/**
 * «Cerca qualsiasi scheda da modificare»: every content of the chosen edition (spells, creatures with the homebrew,
 * magic items, conditions, classes, equipment, manual); a result opens the editor of the card.
 */
export function AdminGlobalSearch({ entries }: { entries: SearchEntry[] }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const wanted = fold(query.trim());
    if (wanted.length < 2) return [];
    const starts: SearchEntry[] = [], inside: SearchEntry[] = [];
    for (const entry of entries) {
      const name = fold(entry.name);
      if (name.startsWith(wanted)) starts.push(entry);
      else if (name.includes(wanted)) inside.push(entry);
    }
    return [...starts, ...inside].slice(0, 30);
  }, [entries, query]);
  return (
    <div className="relative">
      <label className="relative block">
        <span className="sr-only">Cerca qualsiasi scheda da modificare</span>
        <Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#5E4E3E]" aria-hidden="true" />
        <input {...SEARCH_INPUT} value={query} onChange={event => setQuery(event.target.value)}
          placeholder="Cerca qualsiasi scheda da modificare"
          className="block min-h-[52px] w-full rounded-[16px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] pl-11 pr-4 text-[16px] text-[#2B2118] outline-none placeholder:text-[#7A6A58] focus:border-[#7A1F2B]" />
      </label>
      {query.trim().length >= 2 && (
        <ul aria-label="Schede trovate" data-admin-search-results="" className="mt-2 overflow-hidden rounded-[16px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0]">
          {results.length === 0 ? <li className="px-4 py-4 text-[15px] text-[#5E4E3E]">Nessuna scheda con questo nome.</li> : results.map(entry => (
            <li key={entry.href} className="border-t border-[#DDCFAE]/60 first:border-t-0">
              <Link href={entry.href} prefetch={false} className="flex min-h-12 items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold">{entry.name}</span>
                  <span className="block text-[13px] text-[#5E4E3E]">{entry.kind}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-[#B9A57C]" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
