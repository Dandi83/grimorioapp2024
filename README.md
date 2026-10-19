# Il Grimorio.App — Incantesimi e Bestiario D&D 5e

App web (Next.js) per consultare, cercare e filtrare incantesimi, mostri e animali
di Dungeons & Dragons 5e in italiano, con preferiti e un'area riservata per
modificare le schede. Sito: https://ilgrimorio.app

## Struttura del repository

- **radice** — l'app web Next.js (questa è quella che Vercel pubblica).
- I vecchi prototipi Expo/FastAPI di Emergent (`frontend/`, `backend/`) sono stati rimossi il 19 ottobre 2026.

## Dati

Gli incantesimi sono nel database **Neon Postgres** (tabella `spells`); le creature SRD sono incluse nel codice e le schede aggiunte o modificate dall'area riservata sono nella tabella `monsters`.
Il sito pubblico legge dal database; l'area riservata scrive nel database.

Lo script `scripts/seed.mjs` ripopola la tabella dal file JSON originale: **non eseguirlo sul database reale**, sovrascriverebbe le modifiche fatte dall'area riservata.

## Verifiche

- `npm run lint` — controllo dello stile del codice (ESLint, regole Next.js).
- `npm test` — test veloci (nessun database reale, nessuna rete).
- `npm run test:e2e` — build di produzione e prove nel browser (Playwright, viewport iPhone) su un database PostgreSQL di prova in memoria (PGlite). Con un Chromium già installato: `PW_CHROMIUM_PATH=/percorso/chrome npm run test:e2e`.
- GitHub Actions (`.github/workflows/ci.yml`) esegue tipi, test e prove nel browser su ogni pull request.

## Area riservata (modifica incantesimi)

- URL: `/admin`
- Protetta da una passcode segreta salvata nella variabile d'ambiente `ADMIN_PASSCODE`.
- Massimo 5 tentativi errati ogni 15 minuti per indirizzo (100 in un'ora in totale); la sessione scade dopo 30 giorni. Cambiare la passcode chiude tutte le sessioni.
- Da lì puoi **creare, modificare ed eliminare** incantesimi e creature. Le modifiche
  compaiono subito sul sito pubblico.

## Variabili d'ambiente richieste

- `DATABASE_URL` — fornita automaticamente dall'integrazione Neon.
- `ADMIN_PASSCODE` — la passcode segreta per accedere a `/admin`.
- `ANALYTICS_SECRET` — chiave casuale che firma gli identificativi delle statistiche, separata dalla passcode (se manca si usa la passcode).

## Pubblicare su Vercel

1. **Root Directory**: deve essere la radice del repository (dove si trova questo
   `package.json`), NON `frontend`.
2. Assicurati che `ADMIN_PASSCODE` e le variabili Neon siano presenti nel progetto Vercel.
3. Se vedi la schermata di login Vercel invece del sito, disattiva la
   **Deployment Protection** nelle impostazioni del progetto (Settings →
   Deployment Protection) per rendere il sito pubblicamente accessibile.
