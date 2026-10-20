import Link from "next/link";
import { LEGACY_MANUAL_SOURCE_URL, MANUAL_SOURCE_URL, type ManualEntry } from "@/lib/manual-types";
import { ConditionContent, LegacyConditionContent } from "@/components/condition-content";

/**
 * Tables shown as structured data in the Equipaggiamento section: the PDF table breaks across
 * pages and prints some rows twice. The rule text of the entry stays here.
 */
const EQUIPMENT_TABLES: Record<string, { href: string; title: string; text: string; starts: string[] }> = {
  "equipaggiamento-armi": { href: "/equipaggiamento/armi", title: "Tabella delle armi", text: "Danni, proprietà, padronanza, peso e costo di ogni arma, 2014 e 2024 a confronto.", starts: ["Armi\nNome", "Nome "] },
};
export const replacedTable = (entry: ManualEntry, text: string) => EQUIPMENT_TABLES[entry.id]?.starts.some(start => text.startsWith(start));

export function ManualContent({ entry }: { entry: ManualEntry }) {
  return <div className="min-w-0 max-w-full space-y-5">
    {entry.edizione === "2014" ? <LegacyConditionContent entry={entry} /> : entry.category === "condizioni" ? <ConditionContent entry={entry} /> : entry.blocks.map((block, i) => block.kind === "table" && replacedTable(entry, block.text) ? (
      entry.blocks.findIndex(other => other.kind === "table" && replacedTable(entry, other.text)) === i ? (
        <Link key={i} href={EQUIPMENT_TABLES[entry.id].href} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border-2 border-primary bg-primary-faint p-4">
          <span>
            <span className="block font-serif text-lg font-bold text-primary">{EQUIPMENT_TABLES[entry.id].title}</span>
            <span className="block text-sm text-muted">{EQUIPMENT_TABLES[entry.id].text}</span>
          </span>
          <span aria-hidden="true" className="text-xl font-bold text-primary">→</span>
        </Link>
      ) : null
    ) : block.kind === "heading" ? (
      <h2 key={i} className="pt-3 font-serif text-xl font-bold text-primary">{block.text}</h2>
    ) : block.kind === "table" ? (
      <div key={i} className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-border bg-card" tabIndex={0} role="region" aria-label={`Tabella di ${entry.title}, pagina ${block.page}, scorribile orizzontalmente`}>
        <pre className="w-max min-w-full p-4 font-mono text-xs leading-5 text-card-foreground">{block.text}</pre>
      </div>
    ) : (
      <p key={i} className="font-serif text-[1.05rem] leading-7 text-card-foreground">{block.text}</p>
    ))}
    <aside aria-label="Fonte della voce" className="rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted">
      <p>Testo integrale: {entry.edizione === "2014" ? "SRD 5.1 italiano, Appendice A del Manuale del Giocatore" : "SRD 5.2.1 italiano"} — {entry.title}.</p>
      <a className="underline underline-offset-4" href={`${entry.edizione === "2014" ? LEGACY_MANUAL_SOURCE_URL : MANUAL_SOURCE_URL}#page=${entry.page}`} target="_blank" rel="noreferrer">Fonte ufficiale, {entry.pages.length === 1 ? "pagina" : "pagine"} {entry.pages.join(", ")}</a>
      {" · "}<Link className="underline underline-offset-4" href="/fonti">Attribuzione e licenza</Link>
    </aside>
  </div>;
}
