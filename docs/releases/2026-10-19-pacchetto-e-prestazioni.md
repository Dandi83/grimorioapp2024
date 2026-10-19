# Pacchetto E — prestazioni — 19 ottobre 2026

Branch `perf/prestazioni-catalogo-20261019`, base `main` a `285b205`. Punti P1–P5 del rapporto, AVIF ritirato, Bestiario a pagine da 40 righe (richiesta di Daniele).

## Modifiche

- AVIF ritirato: `images.formats` torna a `["image/webp"]`, come deciso il 18 ottobre dopo la regressione su iPhone (vedi `2026-10-18-prestazioni-immagini.md`). Verificato anche in `tests/security-headers.cjs`.
- P1: le 15 pagine delle Condizioni (`/manuale/[id]`) sono generate durante la build invece che a ogni visita. Le altre voci del Manuale restano visibili solo in anteprima, come prima.
- P2: Bestiario a pagine da 40 righe con «Mostra altri», come gli Incantesimi; la paginazione riparte cambiando sezione, ricerca o filtri; il contatore dei risultati conta tutte le pagine. Righe dei mostri memorizzate (`React.memo`): toccare una stella ridisegna solo quella riga. Ricerca differita come negli Incantesimi.
- P3: `app/icon.png` 588 KB → 47 KB (256×256), `public/icon-512.png` 1,4 MB → 329 KB (ora davvero 512×512, come dichiarato nel manifest). Nuova anteprima dei link condivisi degli incantesimi `public/hero-libro-og.jpg` (106 KB, stessa immagine) al posto del PNG da 1,4 MB. Confronto visivo con l'originale: PSNR oltre 45 dB, differenza non percepibile.
- P4: Bestiario e Preferiti leggono un indice leggero dei mostri in cache (`getMonsterListIndex`, tag `monsters`, invalidato dai salvataggi amministrativi) invece dell'intero catalogo a ogni rigenerazione.
- P5: la pulizia dei dati statistici oltre 90 giorni avviene solo nel cron notturno, non più a ogni evento.

## Non modificato

- P6 (chiamata `/api/analytics` all'apertura): lasciata com'è, costo minimo.
- Provider della sessione personaggi nel layout: spostarlo cambierebbe il comportamento della pagina personaggi (solo anteprima); lasciato.

## Verifiche

- `tests/bestiario-browser-dom.cjs` aggiornato: 40 righe per pagina, ogni mostro e animale raggiungibile con «Mostra altri», azzeramento della paginazione.
- `tests/catalog-list-payload.cjs` e `scripts/check-monster-favorites.mjs` aggiornati al nuovo indice dei mostri.
- `npm test`, `test:catalog-performance`, `test:creature-editor`, `npx tsc --noEmit`, compilazione `next build`: superati.
