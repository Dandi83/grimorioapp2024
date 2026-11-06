# «⚔ Affrontalo in Total Party Kill» e grassetti spezzati nei dati SRD (PROMPT 69, 6 novembre 2026)

## Parte A — il pulsante

In fondo alle schede dei mostri 2024 un riquadro apre Total Party Kill con quel mostro pronto da combattere.

- **Dove**: `app/mostro/[id]/page.tsx`, subito dopo il corpo della scheda (`MonsterSheetBody`, quindi dopo l'ultimo blocco: azioni leggendarie, reazioni, tratti o le sezioni della redazione) e prima del riquadro della fonte / attribuzioni. Preferiti e Condividi restano in alto.
- **Quali schede** (`lib/tpk-summon.ts`, `tpkSummonApplies`): mostri e animali SRD 5.2.1 (anche se modificati dall'admin: l'id resta quello SRD); creature originali della redazione e della community con edizione 2024 o «Entrambe». Mai: schede 2014 (SRD 5.1, `-2014`, creature 2014), schede NO SRD da manuale o «Aggiunta da te» (TPK non le ha), creature della community senza licenza accettata (le stesse regole dell'elenco per TPK, `lib/tpk-creatures.ts`).
- **Parte «Affrontalo in TPK»** del Bestiario (`lib/public-sections.ts`, gruppo «Blocchi», senza `set`: nasconderla non nasconde il Bestiario né la scheda). Stato di partenza «Nascosta» (`DEFAULT_PART_STATES` in `lib/section-visibility.ts`), perché in TPK «Evoca» è ancora «In arrivo». Si gestisce da /admin/sezioni ed è coperta da «Nascondi tutto» / «Nascondi tutta la sezione» (`bulkKeys` prende tutte le parti del registro).
- **Nascosta o «In arrivo»**: il pubblico non ha né il pulsante né il suo HTML (`components/tpk/tpk-summon.tsx` restituisce `null` sul server). L'admin (anteprima attiva al login) lo vede con «Nascosta» e «Mostra» sopra.
- **Aspetto** (approvato da Daniele): riquadro crema (`bg-card`) con bordo bordeaux 1,5 px e angoli in rame (`pg-angoli`, PROMPT 64); a sinistra icona tonda bordeaux con ⚔ crema; titolo «Affrontalo in Total Party Kill» bordeaux grassetto; sotto «Scegli il tuo party e combatti · si apre in una nuova scheda» attenuato; › a destra. Altezza minima 64 px (area di tocco ≥ 44 px).
- **Link**: `tpkSummonUrl(id)` in `lib/tpk.ts` → `https://www.totalpartykill.app/evoca?mostro=<id>&da=grimorio`, con `id` l'id pubblico di /mostro/<id>. `<a target="_blank" rel="noopener">` semplice: niente `next/link`, niente prefetch, nessuna richiesta del Grimorio a TPK, nessuna voce in CSP o CORS.
- **Statistiche**: evento `tpk_summon_click` (`lib/analytics-events.ts`), accettato solo da `/mostro/<id>`; il mostro è quello dell'indirizzo, non si manda altro. Parte solo se le statistiche sono attive per quel visitatore (come gli altri eventi: «No» e dispositivi admin esclusi). In /admin/statistiche, Approfondimenti → «Funzioni»: barra «Affrontalo in TPK» (persone del periodo) e i 5 mostri più scelti (tocchi e persone).
- Non tocca `/api/catalogo/*`, `/api/tpk/*`, sitemap, ricerca o service worker. `lib/shared/scheda-tpk-v1.ts` non è toccato.

## Parte B — grassetti spezzati nei dati SRD

Nel PDF SRD 5.2.1 italiano alcuni titoli in grassetto vanno a capo; la trascrizione li spezzava in due paragrafi:
`<strong>Resistenza leggendaria (3/giorno o 4/giorno nella </strong><br><br><strong>tana).</strong>`.
Ora: `<strong>Resistenza leggendaria (3/giorno o 4/giorno nella tana).</strong>`.

- **Causa e correzione nello script**: `scripts/transcribe-srd-monsters.py`, `render()`: una riga che inizia in grassetto corsivo non apre un nuovo paragrafo se la riga prima finisce in grassetto senza punto (titolo ancora aperto). Dati rigenerati dal PDF ufficiale (SHA-256 `a7b88b0c…b1f5e1f718`, invariato): prima della correzione lo script riproduceva i file identici al byte.
- **Triceratopo**: nel PDF tutta la frase «Multiattacco. Il triceratopo effettua due attacchi Trafiggere.» è in grassetto. Il 24 ottobre era stato deciso che il titolo è solo «Multiattacco.» (`lib/data/layout-repairs-20261024.json`); `scripts/transcribe-srd-animals.py` applica la stessa scelta anche ai dati, così la pagina resta uguale a prima.
- **Parole identiche**: per ogni scheda il testo senza tag è identico a prima (impronte in `tests/fixtures/srd-monster-words-20261106.json`, controllate da `tests/srd-grassetti.cjs`); i controlli sul PDF (`check-srd-monsters-source.py`, `check-srd-animals.py`) passano.
- **Sul sito non cambia l'aspetto**: `lib/display-layout.ts` riparava già questi casi alla visualizzazione; ora sono corretti anche nei dati (utile a chi li legge senza quella riparazione). La riparazione alla visualizzazione resta per eventuali copie vecchie nel database.
- I dati 2014 (SRD 5.1) non avevano casi.

28 blocchi corretti:
- `tratti`, «Resistenza leggendaria (3/giorno o 4/giorno nella tana).»: drago-bianco-adulto, drago-blu-adulto, drago-d-argento-adulto, drago-di-bronzo-adulto, drago-di-rame-adulto, drago-d-oro-adulto, drago-d-ottone-adulto, drago-nero-adulto, drago-rosso-adulto, drago-verde-adulto, signore-delle-mummie, sfinge-della-conoscenza, sfinge-del-valore, vampiro;
- `tratti`, «Resistenza leggendaria (4/giorno o 5/giorno nella tana).»: drago-bianco-antico, drago-blu-antico, drago-d-argento-antico, drago-di-bronzo-antico, drago-di-rame-antico, drago-d-oro-antico, drago-d-ottone-antico, drago-nero-antico, drago-rosso-antico, drago-verde-antico, kraken, lich;
- `azioni_bonus`, «Movimento predatorio (solo in forma di tigre o ibrida).»: tigre-mannara;
- `azioni`, «Multiattacco.»: triceratopo (animali).

## Prove
- `tests/tpk-summon.cjs`: link esatto (drago-nero-adulto, homebrew-squartatore), schede ammesse ed escluse, parte nascosta di partenza, evento, posizione nella pagina, nessuna richiesta a TPK.
- `tests/srd-grassetti.cjs`: nessun titolo spezzato in tutti i blocchi SRD (2024, animali, 2014); testo senza tag identico per tutte le 652 schede; i 28 blocchi.
- `tests/analytics.cjs`: conteggio di persone e mostri più scelti (PGlite). `scripts/check-srd-monsters.mjs`: il pulsante dopo la scheda e prima della fonte su tutte le 235 schede SRD 5.2.1.
- `e2e/affrontalo-tpk.spec.mjs`: pubblico senza pulsante né HTML; admin con «Nascosta», link, target, posizione, area di tocco; creatura della redazione; niente sulle schede 2014; parte resa visibile: tocco contato e visibile in /admin/statistiche; nessuna richiesta verso totalpartykill.app.
