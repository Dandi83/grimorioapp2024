# Pacchetto H — navigazione, messaggi e nome dell'app — 19 ottobre 2026

Branch `fix/navigazione-messaggi-20261019`, base `main` a `c0fafe5`. Punti B3, B4, B5, B6 e Q8 del rapporto. Cambiamenti visibili approvati da Daniele.

## Modifiche

- B3: tornando indietro da una scheda (pulsante dell'app o gesto del browser), Incantesimi e Bestiario ritrovano ricerca, filtri, sezione, pagine mostrate con «Mostra altri» e posizione di scorrimento. Lo stato è salvato nella memoria della scheda del browser (`sessionStorage`) e ripristinato solo nel ritorno indietro verso lo stesso indirizzo; arrivando dalla barra in basso l'elenco riparte pulito come prima.
- B4: il pulsante indietro di una scheda aperta da un link condiviso (nessuna pagina del sito prima) porta all'elenco: Incantesimi per gli incantesimi, Bestiario per mostri e animali, Home per le Condizioni. Dentro il sito torna alla pagina precedente come prima.
- B5: se l'eliminazione di un incantesimo o di una creatura fallisce, accanto al cestino compare «Eliminazione non riuscita: la scheda è ancora presente. Riprova.» invece della pagina di errore generica.
- B6: un indirizzo malformato inviato alle statistiche riceve «richiesta non valida» (400) invece di un errore del server (503).
- Q8: nome sotto l'icona dell'app installata «Grimorio» (manifest `short_name` e titolo Apple). Nome completo, titoli delle pagine, descrizioni e invito all'installazione aggiornati a «Il Grimorio.App» con incantesimi, mostri e animali; tolto il riferimento al tira-dadi. README aggiornato, con l'avvertenza di non eseguire `seed.mjs` sul database reale.

## Verifiche

- `tests/bestiario-browser-dom.cjs`: ripristino dopo indietro (ricerca, pagine, scorrimento), avvio pulito senza indietro, nessun ripristino su indirizzo diverso, Bestiario.
- `tests/ui-shell-dom.cjs`: pulsante indietro su link condiviso, dentro il sito e dopo il ritorno alla prima scheda; conferma e messaggio d'errore dell'eliminazione.
- `tests/admin-editor-editions.cjs`: eliminazione con database non disponibile (nessuna cancellazione, messaggio chiaro).
- `tests/analytics.cjs`: indirizzo malformato → 400 (il codice precedente rispondeva 503).
- Prove nel browser: 8 su 8, comprese le nuove su ritorno all'elenco e link condivisi.
- `npm test`, `test:creature-editor`, `test:catalog-performance`, `npx tsc --noEmit`: superati.
