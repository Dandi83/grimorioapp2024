# Avviso «copia salvata» più affidabile — 20 ottobre 2026

Branch `fix/avviso-offline-20261020`.

- Problema: la prova automatica offline su GitHub (PR #17) ha visto una volta la copia salvata senza l'avviso «Sei offline». L'avviso dipendeva solo da un dato che il service worker teneva in memoria: se il browser ferma il service worker tra il caricamento e la domanda della pagina (succede spesso su iPhone), l'avviso si perde.
- Correzione: quando serve una copia salvata, il service worker scrive la data nella pagina stessa (`<meta name="grimorio-saved-at">`, solo nella risposta, non nella copia conservata). La pagina legge quel segno; continua comunque a chiedere al service worker, così la sua memoria viene consumata e non arriva alla pagina successiva caricata online (errore trovato durante la prova: senza la domanda l'avviso compariva anche online).
- File: `lib/sw/service-worker.js`, `components/service-worker.tsx`, `tests/service-worker.cjs`, `e2e/offline.spec.mjs`.
- Verifiche: test unitari, `npm run test:e2e` (11 prove) e la prova offline ripetuta 15 volte di fila senza errori.
