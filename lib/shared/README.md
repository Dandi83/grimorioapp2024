# File condivisi con Total Party Kill

## scheda-tpk-v1.ts — Scheda TPK v1

È il formato comune per scambiare personaggi tra Total Party Kill (TPK) e Il Grimorio.App: TPK crea i personaggi, il Grimorio li salva e li mostra.

- Origine: repository `Dandi83/total-party-kill`, file `src/shared/scheda-tpk-v1.ts`.
- Copiato dal commit `94f3b97d7cfdbd75a7ef38145a6b05a78c68a403` (main del 5 novembre 2026, PROMPT 61).
- SHA-256: `ff612fa10daf4069f0d4da488cb8967ced4c5bee5f5b8e6e1d24533af5a5669b`.

**Regola:** il file si modifica solo in TPK, poi si ricopia qui identico, byte per byte. Al ricopiamento si aggiornano in questo README il commit e lo SHA-256, e lo SHA-256 in `tests/scheda-tpk-grimorio.cjs`. Nel file non si aggiungono commenti o correzioni: una modifica fatta solo qui fa fallire `npm test` e la CI.

### Test
- `tests/scheda-tpk-v1.test.ts`: è il test di TPK (SHA-256 originale `b89bef1d6bfad86df91ed93f376fe2838c68eb87174730cccb635540ae5fb77b`), identico tranne il percorso dell'import (`../lib/shared/scheda-tpk-v1`). Gira con Vitest 5.1.0, la stessa versione di TPK, installata solo come dipendenza di sviluppo, dentro `npm test`.
- `tests/scheda-tpk-grimorio.cjs` controlla, dal lato del Grimorio:
  - lo SHA-256 del file;
  - che il link d'esempio di Brenna si decodifichi;
  - che ogni id esista nel Grimorio: classi, sottoclassi, talenti e abilità;
  - che la tabella degli indirizzi degli incantesimi sia uguale a `lib/data/public-spell-ids.json`;
  - che gli incantesimi di Brenna abbiano una scheda 2024.

  Se il Grimorio cambia la tabella degli indirizzi, il test lo segnala: la nuova tabella va copiata prima in TPK, poi il file si ricopia qui.

Per ora nessuna pagina importa questo file: non entra nel codice scaricato dai visitatori.
