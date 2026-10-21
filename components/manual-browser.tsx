"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowRight, BookOpen } from "lucide-react";
import { MANUAL_CATEGORIES, type ManualCategory } from "@/lib/manual-types";
export interface ManualIndexEntry {
  id: string;
  title: string;
  category: ManualCategory;
  subgroup: string;
  page: number;
  search: string;
}
export function ManualBrowser({
  entries,
  initialCategory,
}: {
  entries: ManualIndexEntry[];
  initialCategory?: ManualCategory;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ManualCategory | "tutte">(initialCategory || "tutte");
  const filtered = useMemo(
    () =>
      entries
        .filter(
          (entry) =>
            (category === "tutte" || entry.category === category) &&
            entry.search.includes(query.toLocaleLowerCase("it").trim()),
        )
        .sort((a, b) => a.title.localeCompare(b.title, "it")),
    [entries, category, query],
  );
  return (
    <div className="min-w-0">
      <header className="border-b border-border px-6 pb-5 pt-7">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
          SRD 5.2.1 · italiano
        </p>
        <h1 className="font-serif text-4xl font-bold">Manuale</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Regole e riferimenti da avere a portata di mano.
        </p>
      </header>
      <div className="space-y-4 px-6 py-5">
        <Link
          href="/bestiario?raccolta=animali"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
        >
          <span>
            <span className="block font-serif text-lg font-semibold">Animali</span>
            <span className="text-xs text-muted">Consulta gli animali del Bestiario</span>
          </span>
          <ArrowRight size={18} className="text-primary" />
        </Link>
        <Link
          href="/equipaggiamento"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
        >
          <span>
            <span className="block font-serif text-lg font-semibold">Equipaggiamento</span>
            <span className="text-xs text-muted">Armi delle edizioni 2014 e 2024 a confronto</span>
          </span>
          <ArrowRight size={18} className="text-primary" />
        </Link>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3">
          <Search size={18} className="text-muted" />
          <input
            className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none"
            type="search"
            aria-label="Cerca nel Manuale"
            placeholder="Cerca nel Manuale..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["tutte", ...Object.keys(MANUAL_CATEGORIES)].map((key) => (
            <button
              type="button"
              key={key}
              aria-pressed={category === key}
              onClick={() => {
                setCategory(key as ManualCategory | "tutte");
              }}
              className={`rounded-full border px-3 py-2 text-sm ${category === key ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted"}`}
            >
              {key === "tutte" ? "Tutto" : MANUAL_CATEGORIES[key as ManualCategory]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "voce" : "voci"}
        </p>
      </div>
      <ul className="px-6 pb-6">
        {filtered.map((entry) => (
          <li key={entry.id} className="border-b border-divider">
            <Link href={`/manuale/${entry.id}`} className="flex items-center gap-3 py-4">
              <BookOpen size={20} className="shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block font-serif text-lg font-semibold">{entry.title}</span>
                <span className="text-xs text-muted">
                  {MANUAL_CATEGORIES[entry.category]}
                  {entry.category === "creazione" ? ` · ${entry.subgroup}` : ""} · p. {entry.page}
                </span>
              </span>
              <ArrowRight size={16} className="shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
      {!filtered.length && (
        <p className="px-6 py-8 text-center text-muted">Nessuna voce trovata.</p>
      )}
    </div>
  );
}
