# File condivisi con Total Party Kill

## scheda-tpk-v1.ts — Scheda TPK v1

È il formato comune per scambiare personaggi tra Total Party Kill (TPK) e Il Grimorio.App: TPK crea i personaggi, il Grimorio li salva e li mostra.

- Origine: repository `Dandi83/total-party-kill`, file `src/shared/scheda-tpk-v1.ts`.
- Copiato dal commit `4bf6756f487e11d8978b8c1a1f3047365e4ce09d` (main del 6 novembre 2026, PROMPT 38 di TPK: campo facoltativo `"ed"` e rifiuto dei PG 2014; nel Grimorio PROMPT 71). Copia precedente: commit `94f3b97` (PROMPT 61).
- SHA-256: `9fc41853264b3c8984033d6e0eb91824e5941a2d723a8f3e46f5042bbde25130`.

**Regola:** il file si modifica solo in TPK, poi si ricopia qui identico, byte per byte. Al ricopiamento si aggiornano in questo README il commit e lo SHA-256, e lo SHA-256 in `tests/scheda-tpk-grimorio.cjs`. Nel file non si aggiungono commenti o correzioni: una modifica fatta solo qui fa fallire `npm test` e la CI.

### Test
- `tests/scheda-tpk-v1.test.ts`: è il test di TPK (SHA-256 originale `79cae58fb793a38ac633cc872adc759ad49ffca0ed270cf6739d39a7da1a4066`), identico tranne il percorso dell'import (`../lib/shared/scheda-tpk-v1`). Gira con Vitest 5.1.0, la stessa versione di TPK, installata solo come dipendenza di sviluppo, dentro `npm test`.
- `tests/scheda-tpk-grimorio.cjs` controlla, dal lato del Grimorio:
  - lo SHA-256 del file;
  - che il link d'esempio di Brenna si decodifichi;
  - che ogni id esista nel Grimorio: classi, sottoclassi, talenti e abilità;
  - che la tabella degli indirizzi degli incantesimi sia uguale a `lib/data/public-spell-ids.json`;
  - che gli incantesimi di Brenna abbiano una scheda 2024.

  Se il Grimorio cambia la tabella degli indirizzi, il test lo segnala: la nuova tabella va copiata prima in TPK, poi il file si ricopia qui.

Lo importa solo la pagina beta /personaggi (`components/characters-beta/characters-app.tsx`, PROMPT 62): sta in un chunk usato solo da quella pagina, mai nel codice delle altre.

### Campo `"ed"` (PROMPT 71)
Dal commit `4bf6756` il file ha il campo facoltativo `"ed": "2024" | "2014"` e `decodeHash` rifiuta i PG 2014 (`segni2014`, `MESSAGGIO_2014`). Nel Grimorio (`lib/characters-beta.ts`):
- `sheetForTpk`: il PG mandato a TPK ha sempre `"ed": "2024"` (aggiunto se manca, su una copia: il PG salvato non cambia); un PG 2014 non va a TPK.
- `incomingFromLink`: un PG 2014 con i campi validi si riceve lo stesso, con l'avviso.
