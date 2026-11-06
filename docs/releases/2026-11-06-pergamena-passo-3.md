# Stile «pergamena illustrata», passo 3 (PROMPT 68, 6 novembre 2026)

Completa lo stile dei PROMPT 64–65 con le decisioni di Daniele sul REPORT 65, le pagine secondarie, gli avvisi e le
card «Condividi come immagine». Stessi elementi comuni (`app/globals.css`, `components/pergamena/pergamena.tsx`).
Regola: lo stile arricchisce titoli, cornici e pulsanti, mai il testo delle schede.

## Decisioni sul REPORT 65

1. Divisore ✦ al posto della riga di 4 px: resta.
2. Etichette delle liste: restano.
3. Compendio: etichetta «REGOLE E PERSONAGGI · SRD 5.2.1» (una riga a 390 e 412 px, controllato in
   `e2e/pergamena.spec.mjs`).

## Pagine secondarie

Intestazione come le schede: etichetta in maiuscoletto (`Etichetta`, parole con `data-pg-nuovo`), capilettera CSS
sull'H1 (il testo dell'H1 non cambia), divisore ✦. H1 nel colore del testo (prima bordeaux su /info, /termini,
/installa), così la capilettera bordeaux si distingue.

| Pagina | Etichetta | Angoli di rame |
| --- | --- | --- |
| /info | IL GRIMORIO.APP · NOTE LEGALI | le 5 tessere e il riquadro «Diritti d'autore» |
| /fonti | NOTE LEGALI · SRD 5.2.1 E 5.1 | — (nessuna card) |
| /privacy | NOTE LEGALI · PRIVACY | — |
| /termini | NOTE LEGALI | — |
| /sostieni | CONTRIBUTO LIBERO · KO-FI | riquadro «Il tuo aiuto, in concreto» |
| /installa | APP · IPHONE, ANDROID E COMPUTER | le voci dei browser |
| 404 | ERRORE 404 | — |
| «in costruzione» | LAVORI IN CORSO (senza nome di sezione; con il nome resta «<nome> PRESTO») | — |

Testi legali, attribuzioni SRD e firma «© 2026 D.d.B. – Il Grimorio.App» invariati. Il titolo «Sezione
momentaneamente in costruzione» ha `text-balance`, così la capilettera non sposta le righe a 390 px.

## Avvisi

- «Installala» (`components/install-prompt.tsx`): angoli di rame, capilettera su «Aggiungi Il Grimorio.App»,
  pulsanti `pg-pulsante` / `pg-pulsante-chiaro`.
- «Come ti trovi?» (`components/home/rating-box.tsx`): angoli di rame, domanda in EB Garamond con capilettera,
  faccine `pg-pulsante-chiaro`, «Condividi»/«Scrivici» `pg-pulsante`.
- `pg-pulsante*` usano solo `box-shadow` (filo interno): nessuna misura cambia, nessun salto (PROMPT 57 M5).

## Card «Condividi come immagine»

`lib/share-card-draw.ts`: tutte le card su pergamena (prima: scura per incantesimi, mostri e regole; foto a tutto
campo per le creature con immagine).

- Fondo #F6EFDF con grana chiara (una tessera di 256 px, sequenza con seme fisso, solo puntini più chiari: il testo
  non perde contrasto) e margine esterno #E9DDC2. Niente sfumature radiali: il PNG della Storia passava 1 MB.
- Cornice bordeaux (linea piena e filo interno) con 4 angoli di rame disegnati come `.pg-angoli`.
- Etichetta in maiuscoletto (#5E4E3E), titolo EB Garamond con capilettera bordeaux 1,35×, nome inglese in corsivo,
  divisore ✦, riquadri con etichetta bordeaux, estratto, attribuzione SRD, logo «Il Grimorio.App» con I e G
  bordeaux e «.App» ambra, «ilgrimorio.app» a destra. Niente emoji disegnate (prima «📖» nel piede).
- Creature con immagine: la foto in una cornice tra titolo e riquadri (JPEG come prima); nel Quadrato l'estratto
  scende a 2 righe e la foto sparisce se non c'è spazio.
- Dati, formati (1080×1920, 1080×1080), testi SRD, attribuzioni, eventi e campo `theme` invariati; tutto nel
  browser, nessuna immagine o font nuovi.

## Verifiche

Vedi il REPORT PROMPT 68 (contrasto, LCP/TBT, tempi della card, bundle, prove).
