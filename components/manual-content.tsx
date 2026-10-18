import Link from "next/link";
import { MANUAL_SOURCE_URL, type ManualEntry } from "@/lib/manual-types";
import { ConditionContent } from "@/components/condition-content";

export function ManualContent({ entry }: { entry: ManualEntry }) {
  return <div className="min-w-0 max-w-full space-y-5">
    {entry.category === "condizioni" ? <ConditionContent entry={entry} /> : entry.blocks.map((block, i) => block.kind === "heading" ? (
      <h2 key={i} className="pt-3 font-serif text-xl font-bold text-primary">{block.text}</h2>
    ) : block.kind === "table" ? (
      <div key={i} className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-border bg-card" tabIndex={0} role="region" aria-label={`Tabella di ${entry.title}, pagina ${block.page}, scorribile orizzontalmente`}>
        <pre className="w-max min-w-full p-4 font-mono text-xs leading-5 text-card-foreground">{block.text}</pre>
      </div>
    ) : (
      <p key={i} className="font-serif text-[1.05rem] leading-7 text-card-foreground">{block.text}</p>
    ))}
    <aside aria-label="Fonte della voce" className="rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted">
      <p>Testo integrale: SRD 5.2.1 italiano — {entry.title}.</p>
      <a className="underline underline-offset-4" href={`${MANUAL_SOURCE_URL}#page=${entry.page}`} target="_blank" rel="noreferrer">Fonte ufficiale, {entry.pages.length === 1 ? "pagina" : "pagine"} {entry.pages.join(", ")}</a>
      {" · "}<Link className="underline underline-offset-4" href="/fonti">Attribuzione e licenza</Link>
    </aside>
  </div>;
}
