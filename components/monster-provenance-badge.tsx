import { BookOpen } from "lucide-react";
import type { MonsterProvenance } from "../lib/monsters-types";

/** Source is checked on the server; the catalog never imports the full SRD. */
export function MonsterProvenanceBadge({
  source,
  edition,
  linked = false,
  compact = false,
}: {
  source?: MonsterProvenance;
  edition?: "2014" | "2024";
  linked?: boolean;
  compact?: boolean;
}) {
  const label = source
    ? linked
      ? `${source.document} · ${source.edition === "2014" ? "D&D 2014" : `D&D 5e (${source.edition})`}`
      : `D&D ${source.edition}`
    : edition ? `D&D ${edition}` : "Fonte da verificare";
  const description = source
    ? `Fonte: ${source.document} italiano, pagina ${source.page}. D&D quinta edizione, regole ${source.edition}.`
    : edition ? `D&D ${edition}: edizione indicata dall’amministratore; fonte e licenza non verificate.`
      : "Provenienza ed edizione non verificate per questa versione della scheda.";
  const sizeClass = compact
    ? "shrink-0 gap-1 px-1.5 py-0.5 text-[10px] leading-3.5"
    : "gap-1.5 px-2.5 py-1 text-[10px] leading-4";
  const className = `inline-flex max-w-full items-center rounded-full border font-medium ${sizeClass} ${
    source ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card text-muted"
  }`;
  const content = <><BookOpen size={compact ? 10 : 12} className="shrink-0" aria-hidden="true" /><span className="whitespace-nowrap">{label}</span></>;

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
