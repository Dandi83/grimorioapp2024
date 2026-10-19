# Service worker — uso offline del sito — 19 ottobre 2026

Branch `feat/service-worker-offline-20261019`, base `main` a `78953d5`. Proposta 6 del rapporto, approvata da Daniele con interruttore di emergenza.

## Comportamento

- File del programma (`/_next/static`, immagini ottimizzate, icone, icone dei danni): presi dalla memoria del telefono; cambiano nome a ogni versione, quindi non possono essere vecchi. Massimo 400 file, i più vecchi vengono tolti.
- Pagine pubbliche (Home, Incantesimi, Bestiario, Preferiti, schede, Condizioni, Fonti, Privacy): sempre prima la rete, saltando anche la cache HTTP del browser. Solo senza rete, o dopo 3 secondi senza risposta, si mostra l'ultima copia salvata con l'avviso «Sei offline: questa pagina è la copia salvata il …» e il pulsante «Riprova». Le quattro sezioni principali vengono salvate all'installazione.
- Pagine mai aperte, offline: pagina «Sei offline» con ritorno alla Home.
- Mai gestiti né salvati: `/admin`, `/personaggi`, `/account`, `/manuale` (anteprima), `/api`, Server Actions (POST), dati di navigazione Next (RSC), altri siti, pagine di errore.
- A ogni deploy la versione cambia: il telefono installa il nuovo service worker e cancella le pagine salvate dalla versione precedente.

## Interruttore di emergenza

Su Vercel: variabile `GRIMORIO_SERVICE_WORKER` = `off` (Production), poi nuovo deploy. `/sw.js` diventa un service worker che cancella tutte le copie `grimorio-*`, si disregistra e ricarica le pagine aperte; il sito smette anche di registrarlo. Per riattivarlo: togliere la variabile e rifare il deploy.

## File

`lib/sw/service-worker.js`, `app/sw.js/route.ts` (intestazioni `no-cache`, versione dal commit), `lib/service-worker-config.ts`, `components/service-worker.tsx` (registrazione, avviso, rimozione se spento), `app/layout.tsx`.

## Verifiche

- `tests/service-worker.cjs` (incluso in `npm test`): rete prima, copia salvata offline e dopo il timeout, avviso una sola volta, pagina offline, esclusioni, file del programma, pulizia per versione, nessun uso della cache HTTP, interruttore di emergenza (rimozione e cancellazione delle copie).
- Prove nel browser (Chromium): con un server spento davvero, pagina visitata mostrata con avviso, sezioni principali disponibili, pagina mai aperta con avviso offline, area riservata non servita; tornata la rete, pagina fresca senza avviso. Intestazioni di `/sw.js`.
- Problema trovato e corretto durante le prove: la cache HTTP del browser poteva rispondere al posto della rete e mostrare una pagina vecchia senza avviso.
- `npm test`, `test:creature-editor`, `test:catalog-performance`, `npx tsc --noEmit`, 10 prove nel browser: superati.
- Non verificato: Safari su iPhone reale (da provare sull'anteprima).
