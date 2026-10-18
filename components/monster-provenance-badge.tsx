import { BookOpen } from "lucide-react";
import type { MonsterProvenance } from "../lib/monsters-types";

/** Source is checked on the server; the catalog never imports the full SRD. */
export function MonsterProvenanceBadge({
  source,
  linked = false,
}: {
  source?: MonsterProvenance;
  linked?: boolean;
}) {
  const label = source
    ? `${source.document} · D&D 5e (${source.edition})`
    : "Fonte da verificare";
  const description = source
    ? `Fonte: ${source.document} italiano, pagina ${source.page}. D&D quinta edizione, regole ${source.edition}.`
    : "Provenienza ed edizione non verificate per questa versione della scheda.";
  const className = `inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium leading-4 ${
    source ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card text-muted"
  }`;
  const content = <><BookOpen size={12} className="shrink-0" aria-hidden="true" /><span>{label}</span></>;

  if (source && linked) {
    return (
      <a
        data-monster-provenance="verified"
        href={`${source.sourceUrl}#page=${source.page}`}
        target="_blank"
        rel="noreferrer"
        title={description}
        aria-label={`${description} Apri il documento ufficiale in una nuova scheda.`}
        className={`${className} transition-colors hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary`}
      >
        {content}
      </a>
    );
  }

  return <span data-monster-provenance={source ? "verified" : "unverified"} title={description} aria-label={description} className={className}>{content}</span>;
}
