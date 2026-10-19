import Link from "next/link";
import { AnalyticsPreferencesButton } from "@/components/analytics-provider";
import { srdAttribution, srdSourceUrl } from "@/lib/srd-descriptions";

export const metadata = { title: "Info, fonti e licenze — GrimorioApp" };

export default function SourcesPage() {
  return (
    <article className="space-y-6 p-6">
      <Link href="/" className="inline-flex min-h-11 items-center text-sm text-primary">← Torna alla Home</Link>
      <h1 className="font-serif text-3xl font-bold">Info, fonti e licenze</h1>
      <section className="space-y-3 text-sm"><h2 className="font-serif text-xl text-foreground">Statistiche e privacy</h2><Link href="/privacy" className="block text-primary underline underline-offset-4">Come usiamo i dati di navigazione</Link><AnalyticsPreferencesButton /></section>
      <section aria-labelledby="project-info" className="space-y-3 text-sm leading-6 text-muted">
        <h2 id="project-info" className="font-serif text-xl font-bold text-foreground">Informazioni sul progetto</h2>
        <p>
          * Progetto fan-made a scopo hobbistico.
          Nessuna affiliazione, sponsorizzazione o approvazione da parte di
          Wizards of the Coast o dei detentori dei marchi originali. Tutti i
          marchi registrati appartengono ai rispettivi proprietari.
        </p>
        <p>Il Grimorio.App è un contenuto fan non ufficiale. Non approvato o sponsorizzato da Wizards of the Coast. Parti dei materiali utilizzati sono proprietà di Wizards of the Coast.</p>
        <p><a href="https://company.wizards.com/en/legal/fancontentpolicy" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">Fan Content Policy</a></p>
      </section>
      <section className="space-y-4 font-serif text-[1.05rem] leading-7">
        <h2 className="text-xl font-bold">System Reference Document 5.2.1 italiano</h2>
        <p>{srdAttribution}</p>
        <p>
          Le descrizioni contrassegnate “Testo integrale: SRD 5.2.1 italiano” sono trascrizioni del documento ufficiale.
          Sono stati normalizzati gli spazi, gli a capo e la sillabazione tipografica, conservando le regole, le tabelle e le schede delle statistiche.
        </p>
        <p>
          <a className="text-primary underline underline-offset-4" href={srdSourceUrl} target="_blank" rel="noreferrer">Consulta il documento originale in italiano</a>
        </p>
        <p>
          <a className="text-primary underline underline-offset-4" href="https://creativecommons.org/licenses/by/4.0/legalcode.it" target="_blank" rel="noreferrer">Licenza Creative Commons Attribuzione 4.0 Internazionale</a>
        </p>
      </section>
      <section className="space-y-4 font-serif text-[1.05rem] leading-7">
        <h2 className="text-xl font-bold">System Reference Document 5.1 italiano — D&amp;D 2014</h2>
        <p>Questo lavoro include materiale del System Reference Document 5.1 (“SRD 5.1”) di Wizards of the Coast LLC disponibile al sito https://dnd.wizards.com/it/resources/systems-reference-document. L’SRD 5.1 è concesso in licenza sotto l’Attribuzione 4.0 Internazionale di Creative Commons disponibile al sito https://creativecommons.org/licenses/by/4.0/legalcode.it.</p>
        <p>Le dieci schede contrassegnate “D&amp;D5e 2014” utilizzano esclusivamente le regole SRD 5.1. Sono stati normalizzati spazi, a capo e formattazione. Le cinque varianti sono presentate come schede autonome applicando le modifiche autorizzate alle rispettive schede base del 2014; gli adattamenti sono indicati nella fonte della singola scheda. Non sono conversioni alle regole 2024.</p>
        <p><a className="text-primary underline underline-offset-4" href="https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1_IT.pdf" target="_blank" rel="noreferrer">Consulta lo SRD 5.1 originale in italiano</a></p>
        <p><a className="text-primary underline underline-offset-4" href="https://creativecommons.org/licenses/by/4.0/legalcode.it" target="_blank" rel="noreferrer">Licenza Creative Commons Attribuzione 4.0 Internazionale</a></p>
      </section>
      <section className="space-y-3 text-sm leading-6 text-muted">
        <h2 className="font-serif text-xl font-bold text-foreground">Provenienza dei mostri</h2>
        <p>
          Il bollino sulle creature mostra l’edizione delle regole: “D&amp;D5e 2024”
          oppure “D&amp;D5e 2014”. Nelle schede con fonte verificata, il bollino
          apre la pagina del documento ufficiale.
        </p>
        <p>
          La fonte dichiarata è il documento SRD utilizzato, distinto dal Manuale dei
          Mostri commerciale. L’attribuzione viene verificata confrontando il contenuto
          della scheda con la trascrizione. Per versioni modificate o prive di riscontro
          l’etichetta manuale dell’edizione non certifica una fonte o una licenza.
        </p>
      </section>
      <section className="space-y-3 text-sm leading-6 text-muted">
        <h2 className="font-serif text-xl font-bold text-foreground">Significato dell’asterisco *</h2>
        <p>
          L’asterisco identifica le descrizioni non trascritte dal SRD. Le 49 schede
          indicate come “Sintesi originale delle regole 2024” contengono riepiloghi
          redazionali delle meccaniche 2024: non sono traduzioni ufficiali
          né testi integrali SRD. Le schede degli spiriti richiamati sono riepilogate
          e collegate per la consultazione completa.
        </p>
        <p>
          Anche le dieci descrizioni preesistenti fuori SRD sono state sostituite
          con sintesi originali. L’asterisco non indica che l’incantesimo sia inventato
          o non ufficiale, né attribuisce ai riepiloghi la licenza del documento SRD.
        </p>
      </section>
      <section className="space-y-3 text-sm leading-6 text-muted">
        <h2 className="font-serif text-xl font-bold text-foreground">Icone dei tipi di danno</h2>
        <p>Icone di Baldur’s Gate 3 © Larian Studios, consultate tramite BG3 Wiki. Sono elementi grafici distinti dai testi SRD; GrimorioApp non è affiliata a Larian Studios.</p>
        <p><a className="text-primary underline underline-offset-4" href="https://bg3.wiki/wiki/Category:Damage_type_icons" target="_blank" rel="noreferrer">Icone originali e attribuzione</a></p>
      </section>
    </article>
  );
}
