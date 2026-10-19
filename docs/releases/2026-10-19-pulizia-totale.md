# Pulizia totale del repository — 19 ottobre 2026

Richiesta di Daniele (pacchetto 0): eliminare il materiale non più usato e tutto ciò che riguarda le illustrazioni dei mostri, che non verranno più mostrate.

Branch `chore/pulizia-totale-20261019`, base `main` a `40d71d6`.

## Rimosso

- `uploads/` (compreso `manuale.pdf`, 53 MB, e i JSON di estrazione originali; nessuno script li leggeva).
- Prototipi Emergent: `frontend/`, `backend/`, `.emergent/`, `test_reports/`, `test_result.md`, `memory/`, `tests/__init__.py`, `design_guidelines.json`, `app.code-workspace`.
- Illustrazioni dei mostri: le tre immagini preparate rimaste in `lib/data/prepared-art/`, `lib/prepared-monster-art.ts`, `lib/monster-art-preview.ts`, `lib/data/official-creature-art.json`, `lib/data/prepared-art-manifest.json`, `scripts/prepare-monster-art.mjs`, `tests/prepared-monster-art.cjs`.
- `package.json`: script `pretest` e `prepare:art`, test delle immagini preparate.
- `next.config.mjs`: `remotePatterns` verso `www.dndbeyond.com`.
- Simulazioni dei moduli immagine rimossi nei test delle schede mostro.

## Cambiamento visibile

- Rimossa da `/fonti` la sezione «Crediti delle illustrazioni». Le righe sulla Fan Content Policy di Wizards, valide per tutta l’app, sono spostate in «Informazioni sul progetto».

## Non modificato

- `formats` di `next.config.mjs` (AVIF) resta per il pacchetto E.
- Nessun dato del database, nessuna variabile Vercel.

## Verifiche

- `npm test` completo: superato, senza più accesso di rete a dndbeyond.com.
- `npm run test:catalog-performance`, `npm run test:creature-editor`, `tests/character-dashboard.cjs`: superati.
- `npx tsc --noEmit`: superato.
- `npm run build`: compilazione e controllo dei tipi riusciti; la raccolta dati si ferma per assenza di `DATABASE_URL` in ambiente cloud. Build completa da verificare sull'anteprima Vercel.

## Cronologia git

La rimozione dalla cronologia (`git filter-repo`) è un passaggio separato, autorizzato da Daniele, eseguito solo dopo backup e conferma esplicita prima del force push.
