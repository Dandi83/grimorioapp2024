import Link from "next/link";
import { findReferencedSpells } from "@/lib/spell-references";
export function SpellReferences({html}:{html:string}) {
  const spells=findReferencedSpells(html);if(!spells.length)return null;
  return <aside className="my-5 rounded-xl border border-border bg-card p-4" aria-label="Incantesimi citati"><h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-primary">Incantesimi citati</h2><div className="flex flex-wrap gap-2">{spells.map(spell=><Link key={spell.id} href={`/spell/${spell.id}`} className="rounded-full border border-border px-3 py-2 text-sm text-primary hover:border-primary">{spell.name}</Link>)}</div></aside>;
}
