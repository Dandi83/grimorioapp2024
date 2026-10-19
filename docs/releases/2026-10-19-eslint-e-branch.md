# ESLint e pulizia dei branch — 19 ottobre 2026

Branch `chore/eslint-20261019`, base `main` a `37dbc94`. Ultimi due punti aperti del rapporto (Q5 strumenti, branch vecchi).

## ESLint

- Installati `eslint` 9.39.5 e `eslint-config-next` 16.4.2 (regole Next.js, Core Web Vitals, TypeScript), `eslint.config.mjs`.
- `npm run lint` ora funziona: 0 errori, 27 avvisi. Aggiunto al controllo automatico GitHub Actions.
- Correzioni: `const` in `components/analytics-provider.tsx`; collegamento interno con `Link` (e nome «Il Grimorio.App») nella pagina personaggi, visibile solo in anteprima.
- Le nuove regole del React Compiler (`set-state-in-effect`, `refs`, `immutability`) restano avvisi: segnalano letture volute dopo l'idratazione (memoria del browser, indirizzo); riscriverle cambierebbe il comportamento.
- I test CommonJS (`*.cjs`) possono usare `require` e `module`.
- Prova offline resa stabile: si attende la pagina d'errore del browser prima della navigazione successiva (3 esecuzioni su 3).

## Branch

Analizzati 73 branch remoti: tutti, tranne `main` e `cloud/grimorio-ios-20261018` (base della chat iPhone), sono contenuti in `main` o sono esperimenti superati (anteprime 18 ottobre, AVIF ritirato). L'eliminazione è stata rifiutata dal canale GitHub dell'ambiente cloud; comando per farla dal Mac nella risposta a Daniele. Tutti i branch restano nel backup completo del 19 ottobre.

## Verifiche

- `npm run lint`, `npm test`, `test:creature-editor`, `test:catalog-performance`, `npx tsc --noEmit`, 10 prove nel browser: superati.
