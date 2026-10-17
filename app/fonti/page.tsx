import Link from "next/link";
import { srdAttribution, srdSourceUrl } from "@/lib/srd-descriptions";

export const metadata = { title: "Fonti e licenze — GrimorioApp" };

export default function SourcesPage() {
  return (
    <article className="space-y-6 p-6">
      <Link href="/grimorio" className="text-sm text-primary">← Torna al Grimorio</Link>
      <h1 className="font-serif text-3xl font-bold">Fonti e licenze</h1>
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
    </article>
  );
}
