# Pacchetto C — accesso all'area riservata — 19 ottobre 2026

Branch `fix/accesso-admin-sicuro-20261019`, base `main` a `e61cd87`. Punti S2, S3 e S4 del rapporto. La passcode non cambia (decisione di Daniele).

## S2 — limite ai tentativi

- Massimo 5 passcode errate ogni 15 minuti dallo stesso indirizzo; massimo 100 errate in un'ora in totale.
- Durante il blocco anche la passcode corretta viene rifiutata, con il messaggio «Troppi tentativi. Riprova tra 15 minuti.»
- Pausa di 1 secondo dopo ogni passcode errata.
- Gli indirizzi sono salvati solo come impronta SHA-256 nella tabella `grimorio_admin_login_failures` (creata al primo tentativo, record oltre un giorno cancellati).
- Se il database non risponde l'accesso resta chiuso («Accesso temporaneamente non disponibile»).

## S3 — sessione firmata con scadenza

- Il cookie `grimorio_admin` contiene la scadenza firmata (formato `v2`): dopo 30 giorni non vale più anche se il browser lo conserva; la scadenza non si può allungare.
- Cambiare la passcode chiude tutte le sessioni.
- I cookie del formato precedente non valgono più: serve un nuovo accesso (approvato da Daniele).

## S4 — segreto separato per le statistiche

- Nuova variabile `ANALYTICS_SECRET`: firma gli identificativi dei visitori. Senza di essa si continua a usare la passcode, come prima.
- Gli identificativi firmati con la passcode restano validi e vengono rifirmati con il nuovo segreto alla visita successiva, mantenendo lo stesso visitatore.
- Dopo la transizione, cambiare la passcode non azzera più i visitori nelle statistiche.

## Verifiche

- Nuovo `tests/admin-access.cjs` (sessione, scadenza, cookie vecchi/falsificati, limite tentativi su PostgreSQL PGlite, blocco con database non disponibile), incluso in `npm test`.
- `tests/analytics.cjs` esteso con `ANALYTICS_SECRET`, transizione e cambio passcode.
- `npm test`, `test:creature-editor`, `test:catalog-performance`, `npx tsc --noEmit`, compilazione `next build`: superati.
