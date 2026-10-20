# Protezione: niente schede complete nel codice del telefono — 20 ottobre 2026

Branch `chore/protezione-dati-schede-20261020` da `main`. Nessun cambiamento visibile.

- `scripts/check-client-bundle.mjs`: dopo la build cerca nel codice inviato al browser (`.next/static`) un frammento di testo di ogni scheda completa (SRD 5.1 2014, SRD 5.2.1 mostri e animali). Se ne trova uno, la build fallisce.
- `npm run build` (usato da Vercel) e le prove nel browser (`npm run test:e2e`, anche su GitHub) eseguono il controllo.
- `tests/client-bundle-guard.cjs` (in `npm test`): l'elenco leggero passa, una scheda completa viene respinta.

Prova reale: un componente di prova che importava il file 2014 nel browser ha fatto fallire la build; rimosso subito, non committato.
