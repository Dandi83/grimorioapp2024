# GrimorioApp — Incantesimi D&D 5e (2024)

App web (Next.js) per consultare, cercare e filtrare gli incantesimi di
Dungeons & Dragons 5e edizione 2024 in italiano, con preferiti, tira-dadi e
un'area riservata per modificare gli incantesimi.

## Struttura del repository

- **radice** — l'app web Next.js (questa è quella che Vercel pubblica).
- `frontend/` — la vecchia app Expo/React Native usata su Emergent (non usata da Vercel).
- `backend/` — la vecchia API FastAPI + MongoDB usata su Emergent (non usata da Vercel).

## Dati

I 369 incantesimi sono nel database **Neon Postgres** (tabella `spells`).
Il sito pubblico legge dal database; l'area riservata scrive nel database.

Per ripopolare la tabella dal file JSON originale:

```
node scripts/seed.mjs
```

## Area riservata (modifica incantesimi)

- URL: `/admin`
- Protetta da una passcode segreta salvata nella variabile d'ambiente `ADMIN_PASSCODE`.
- Da lì puoi **creare, modificare ed eliminare** incantesimi. Le modifiche
  compaiono subito sul sito pubblico.

## Variabili d'ambiente richieste

- `DATABASE_URL` — fornita automaticamente dall'integrazione Neon.
- `ADMIN_PASSCODE` — la passcode segreta per accedere a `/admin`.

## Pubblicare su Vercel

1. **Root Directory**: deve essere la radice del repository (dove si trova questo
   `package.json`), NON `frontend`.
2. Assicurati che `ADMIN_PASSCODE` e le variabili Neon siano presenti nel progetto Vercel.
3. Se vedi la schermata di login Vercel invece del sito, disattiva la
   **Deployment Protection** nelle impostazioni del progetto (Settings →
   Deployment Protection) per rendere il sito pubblicamente accessibile.
