# Pacchetto F — test, prove nel browser e controllo automatico — 19 ottobre 2026

Branch `test/playwright-ci-20261019`, base `main` a `fbc027b`. Punti T1, T3, T4 e B7 del rapporto (B7 già risolto dalla pulizia del pacchetto 0: `npm test` non scarica più nulla).

## Aggiunte

- T1: `tests/character-dashboard.cjs` e `tests/monster-spell-links.cjs` ora fanno parte di `npm test`.
- T3:
  - eliminazione di un incantesimo (autorizzazione, cancellazione dell'etichetta, aggiornamento cache) in `tests/admin-editor-editions.cjs`;
  - nuovo `tests/ui-shell-dom.cjs`: pulsante indietro, barra di navigazione (sezione attiva, precaricamento, assente nell'area riservata), invito all'installazione (app installata, chiusura per 7 giorni, Safari iPhone, altri browser iPhone);
  - risposta GET di `/api/analytics` (host, consenso, amministratori, nessuna cache) in `tests/analytics.cjs`;
  - accesso amministrativo e intestazioni già coperti dai pacchetti C e D.
- T4: `npm run test:e2e` costruisce il sito come in produzione e lo prova con Playwright (Chromium, schermo iPhone 13) su un PostgreSQL di prova in memoria (`e2e/test-db.mjs`, PGlite con i 369 incantesimi della fixture e le creature SRD integrate). Mai il database reale. Prove:
  1. Home, barra di navigazione e intestazioni di sicurezza;
  2. Incantesimi: pagine da 40, ricerca, scheda, preferito, indietro, pagina Preferiti dopo ricarica;
  3. Bestiario: pagine da 40, «Mostra altri», Animali, scheda;
  4. collegamento a una Condizione dalla scheda di un mostro; Manuale non pubblico in produzione;
  5. schede inesistenti con 404;
  6. area riservata: passcode errata, accesso con cookie firmato `v2`, uscita.
- Controllo automatico GitHub Actions su ogni pull request e su `main`: tipi, `npm test`, test prestazioni ed editor, build e prove nel browser; tracce salvate se una prova fallisce.

## Verifiche in ambiente cloud

- `npm test`, `npx tsc --noEmit`: superati.
- `npm run test:e2e` (build completa con 756 pagine generate + 6 prove nel browser): superato.
- Il primo giro del controllo GitHub Actions si verifica sulla pull request.
