# Pacchetto B — preferiti robusti — 19 ottobre 2026

Branch `fix/preferiti-robusti-20261019`, base `main` a `1a8bd36`. Punti B1 e B2 del rapporto di controllo.

## Correzioni

- B1: un valore non valido salvato nel browser (oggetto, `null`, testo non JSON) bloccava tutte le pagine con «object is not iterable». Ora viene ignorato e i preferiti ripartono vuoti; da una lista si tengono solo gli ID testuali, senza duplicati.
- B2: con due schede aperte, ogni scheda salvava la propria lista e cancellava le aggiunte dell'altra. Ora la scheda riceve le modifiche dell'altra (evento `storage`) e ogni tocco della stella parte dall'ultima lista salvata.
- Memoria del browser non disponibile (navigazione privata): i preferiti funzionano nella pagina aperta, come prima.

Nessun cambiamento grafico. Chiave di salvataggio invariata (`grimorio.favorites.v1`): i preferiti già salvati restano.

## Verifiche

- Nuovo `tests/favorites-provider-dom.cjs`, incluso in `npm test`: fallisce sul codice precedente con lo stesso errore del bug B1, passa sul nuovo.
- `npm test`, `npm run test:catalog-performance`, `scripts/check-monster-favorites.mjs`, `npx tsc --noEmit`: superati.
