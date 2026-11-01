import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { HOMEBREW_LICENSE_URL } from "@/lib/homebrew-types";
import { CopyrightLine, CopyrightTerms } from "@/components/legal/copyright";
import { TRADEMARK_NOTE } from "@/lib/trademark";

export const metadata = pageMetadata({ name: "Termini d’uso", section: "Info", path: "/termini",
  description: "I termini d’uso di Il Grimorio.App: come si usa l’app, le regole per le creature proposte e per le segnalazioni, i limiti." });

/** Last update of the text below: change it with every change of the terms. */
const UPDATED = "28 ottobre 2026";

/** A short section of the terms. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-serif text-[22px] font-bold leading-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}

/** «Termini d’uso», from the first tile of /info: how the app may be used, proposed creatures and reports, in plain Italian. */
export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 pb-8 pt-4 text-[16px] leading-7 text-muted sm:px-6">
      <div>
        <Link href="/info" className="inline-flex min-h-11 items-center text-[15px] font-bold text-primary">‹ Info e note legali</Link>
        <h1 className="mt-1 font-serif text-[34px] font-bold leading-tight text-primary">Termini d’uso</h1>
        <p className="mt-1 text-[14px]">Ultimo aggiornamento: {UPDATED}</p>
      </div>

      <Section title="Che cos’è Il Grimorio.App">
        <p>
          Il Grimorio.App è un’app gratuita e non ufficiale per consultare incantesimi, mostri, classi, equipaggiamento e regole
          compatibili con la quinta edizione. Non è affiliata a Wizards of the Coast, né
          approvata o sponsorizzata da Wizards of the Coast. Usandola accetti questi termini.
        </p>
        <p data-trademark-note="">{TRADEMARK_NOTE}</p>
      </Section>

      <Section title="Uso consentito e contenuti SRD">
        <p>
          Puoi usare l’app per preparare e giocare le tue partite, a casa o al tavolo. Non è consentito usarla per scopi illeciti,
          per disturbarne il funzionamento o per copiarne i contenuti in modo automatico e massiccio.
        </p>
        <p>
          Molte schede vengono dal System Reference Document (SRD 5.2.1 e SRD 5.1), pubblicato con licenza Creative Commons
          Attribution 4.0. Puoi riutilizzare quei testi rispettando la licenza e le attribuzioni, che trovi in{" "}
          <Link href="/fonti" className="font-semibold text-primary underline underline-offset-4">Fonti e licenze</Link>.
        </p>
      </Section>

      <Section title="Proprietà dei contenuti">
        <CopyrightTerms />
      </Section>

      <Section title="Creature proposte">
        <p>Chiunque può proporre una creatura dal Bestiario, senza account. Proponendola:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>confermi che è una tua creazione originale, non copiata da manuali, siti o altre opere;</li>
          <li>autorizzi Il Grimorio.App a pubblicarla gratuitamente nell’app e a modificarla, per esempio per correggere errori o adattarla alle regole;</li>
          <li>accetti che il nickname che scegli compaia sulla scheda («Proposta da …»);</li>
          <li>resti responsabile di ciò che proponi.</li>
        </ul>
        <p>
          Le creature homebrew sono pubblicate con licenza Creative Commons Attribuzione – Non commerciale – Condividi allo
          stesso modo 4.0 (<a href={HOMEBREW_LICENSE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-4">CC BY-NC-SA 4.0</a>):
          chiunque può condividerle e adattarle per scopi non commerciali, citando l’autore e Il Grimorio.App e pubblicando gli
          adattamenti con la stessa licenza. La licenza non si può revocare: se chiedi la rimozione di una creatura, la togliamo
          dall’app, ma chi l’ha già riusata rispettando la licenza può continuare a farlo.
        </p>
        <p>
          L’amministratore può rifiutare una proposta o rimuovere in qualsiasi momento una creatura già pubblicata, a sua
          discrezione. Puoi chiedere quando vuoi la rimozione di una creatura che hai proposto, scrivendoci da{" "}
          <Link href="/segnala" className="font-semibold text-primary underline underline-offset-4">Scrivici</Link>. Non proporre contenuti offensivi, illegali o che violano diritti di altre persone.
        </p>
      </Section>

      <Section title="Segnalazioni">
        <p>
          Il modulo «Segnala» e «Scrivici» servono a indicare errori nelle schede, problemi dell’app o idee per migliorarla.
          Le segnalazioni sono anonime; l’email è facoltativa e serve solo per risponderti. Come trattiamo questi dati è spiegato
          nella pagina <Link href="/privacy" className="font-semibold text-primary underline underline-offset-4">Privacy</Link>. Per qualsiasi domanda usa{" "}
          <Link href="/segnala" className="font-semibold text-primary underline underline-offset-4">Scrivici</Link>.
        </p>
      </Section>

      <Section title="Segnalazioni di violazione dei diritti">
        <p>
          Se ritieni che una pagina dell’app violi un tuo diritto d’autore o un tuo marchio, segnalalo da{" "}
          <Link href="/segnala" className="font-semibold text-primary underline underline-offset-4">Segnala</Link>, scegliendo
          «Diritti d’autore o marchi (richiesta di rimozione)». Indica l’indirizzo della pagina contestata, spiega quali diritti
          ritieni violati e lascia un’email: per queste richieste è obbligatoria.
        </p>
        <p>
          Il contenuto segnalato viene nascosto in attesa di verifica. Ogni richiesta riceve una risposta all’email indicata.
        </p>
      </Section>

      <Section title="Nessuna garanzia">
        <p>
          Facciamo il possibile perché le schede siano corrette e l’app funzioni, ma è un progetto gratuito: i contenuti possono
          contenere errori e l’app può non essere sempre disponibile. La usi così com’è, senza garanzie. Nei limiti consentiti dalla
          legge, Il Grimorio.App non risponde dei danni che possono derivare dal suo uso o dall’impossibilità di usarla.
        </p>
      </Section>

      <Section title="Modifiche ai termini">
        <p>
          Possiamo aggiornare questi termini quando l’app cambia. La data dell’ultimo aggiornamento è indicata in cima alla pagina;
          continuando a usare l’app dopo una modifica accetti la nuova versione.
        </p>
      </Section>
      <CopyrightLine />
    </article>
  );
}
