import { Search } from "lucide-react";
import { SEARCH_INPUT } from "@/lib/search-input";

/**
 * The search field of the lists of the equipment (Armi, Armature, Oggetti d'avventura, Strumenti): one component, so
 * the four look and behave the same (the keyboard with «Cerca», no autocorrection: lib/search-input.ts).
 */
export function ListSearch({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="relative mt-4 block" data-list-search="">
      <span className="sr-only">{label}</span>
      <Search size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input {...SEARCH_INPUT} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder}
        className="min-h-12 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-[17px]" />
    </label>
  );
}
