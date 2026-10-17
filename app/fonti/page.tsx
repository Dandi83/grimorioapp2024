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
    </article>
  );
}
