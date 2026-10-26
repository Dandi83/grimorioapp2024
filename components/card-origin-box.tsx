import { isNoSrdSource, type CardSource } from "@/lib/card-display";

/**
 * The box at the bottom of a NO SRD card, where an SRD card has «Testo integrale: …» and in the same style: an
 * original summary («Sintesi originale», the 49 of the project and the cards with the switch on) or a card added
 * by the Grimorio. No manual name or page number: the text is not from the SRD. Homebrew keeps its licence box.
 * Plain links: the same component is in the previews of the editor.
 */
export function CardOriginBox({ source, className = "mx-6 mb-6" }: { source: CardSource | undefined; className?: string }) {
  if (!isNoSrdSource(source)) return null;
  const summary = source === "Sintesi originale";
  return (
    <aside aria-label="Provenienza della scheda" data-source-box="" data-card-origin={summary ? "sintesi" : "aggiunta"} className={`${className} rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted`}>
      <p>{summary ? "Sintesi originale del Grimorio, scritta con parole nostre: non è il testo del manuale." : "Scheda inserita dal Grimorio: non fa parte dell’SRD."}</p>
      <p>
        <a className="underline underline-offset-4" href="/fonti#no-srd">Schede NO SRD</a>
        {summary && <>{" · "}<a className="underline underline-offset-4" href="/fonti">Attribuzione e licenza</a></>}
      </p>
    </aside>
  );
}
