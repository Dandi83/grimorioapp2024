import Link from "next/link";

/** The Creative Commons Attribution 4.0 licence of the SRD, in Italian (the plain-language page). */
export const CC_BY_DEED_URL = "https://creativecommons.org/licenses/by/4.0/deed.it";

const link = "font-semibold text-primary underline underline-offset-4";

/**
 * «Diritti d’autore» in /info: the author's rights on the app's own work, before the SRD attributions. The SRD
 * attributions and the trademark note stay as they are; the SRD cards carry no ©.
 * `affiliation`: false where the page already says the app is not affiliated with Wizards of the Coast.
 */
export function CopyrightSection({ affiliation = true }: { affiliation?: boolean }) {
  return (
    <section data-copyright="" aria-labelledby="diritti-autore"
      className="mt-5 space-y-2 rounded-[16px] border-[1.5px] border-primary/40 bg-card px-4 py-3.5 text-[16px] leading-snug text-foreground">
      <h2 id="diritti-autore" className="font-serif text-[22px] font-bold leading-tight text-primary">Diritti d’autore</h2>
      <p>
        © 2026 D.D.B. – Il Grimorio.App. Codice, grafica, logo e testi originali dell’app (comprese le traduzioni e i contenuti
        scritti per Il Grimorio.App) sono opera dell’autore e non possono essere copiati o riutilizzati senza permesso.
      </p>
      <p>
        I contenuti tratti dal System Reference Document (SRD 5.1 e SRD 5.2) sono usati secondo la licenza Creative Commons
        Attribuzione 4.0 e restano liberamente riutilizzabili alle condizioni di quella licenza: vedi le attribuzioni qui sotto
        e la pagina <Link href="/fonti" prefetch={false} className={link}>Fonti</Link>.
      </p>
      {affiliation && <p>Il Grimorio.App non è un prodotto ufficiale e non è affiliato a Wizards of the Coast.</p>}
    </section>
  );
}

/** The same note, shorter, for the «Proprietà dei contenuti» section of /termini (which already states the non-affiliation). */
export function CopyrightTerms() {
  return (
    <>
      <p data-copyright="">
        © 2026 D.D.B. – Il Grimorio.App. Codice, grafica, logo e testi originali dell’app, comprese le traduzioni e i contenuti
        scritti per Il Grimorio.App, sono opera dell’autore e non possono essere copiati o riutilizzati senza permesso.
      </p>
      <p>
        I contenuti tratti dall’SRD 5.1 e dall’SRD 5.2 restano liberamente riutilizzabili secondo la licenza{" "}
        <a href={CC_BY_DEED_URL} target="_blank" rel="noopener noreferrer" className={link}>CC BY 4.0</a>: vedi{" "}
        <Link href="/fonti" prefetch={false} className={link}>Fonti e licenze</Link>.
      </p>
    </>
  );
}

/** The small line at the foot of /info, /termini, /fonti and /privacy. */
export function CopyrightLine() {
  return (
    <p data-copyright-line="" className="mt-8 border-t border-divider pt-3 text-[13px] leading-5 text-muted">
      © 2026 D.D.B. – Il Grimorio.App · Contenuti SRD sotto licenza{" "}
      <a href={CC_BY_DEED_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">CC BY 4.0</a>
    </p>
  );
}
