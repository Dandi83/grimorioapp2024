# Etichette edizione nell’amministrazione

Accanto a ogni mostro e incantesimo in amministrazione è disponibile un selettore:
Automatica, D&D 2014, D&D 2024. Il pulsante «Salva etichetta» aggiorna soltanto
l’edizione. Le nuove schede possono essere etichettate dopo la creazione.

La preferenza è memorizzata nella tabella separata `grimorio_content_editions`,
inizializzata dal primo salvataggio amministrativo. Le letture non eseguono DDL;
un database precedente privo della tabella continua a funzionare. Il salvataggio
richiede l’accesso amministratore e restituisce un errore se non riesce.

L’edizione manuale non certifica una fonte o una licenza. Le attribuzioni esatte
esistenti prevalgono e non possono essere contraddette dal selettore. Le schede
manuali 2014 non generano collegamenti automatici alle regole 2024. L’eliminazione
rimuove contenuto e preferenza nella stessa transazione, evitando il riutilizzo
dell’etichetta su una scheda ricreata con lo stesso identificativo.

## Verifica

- `npm test`: tutte le verifiche preesistenti e il nuovo test amministrativo superati.
- `npx tsc --noEmit`: superato.
- `npm run build`: superato; route amministrative e schede compilate.
- `node tests/admin-editions.cjs`: persistenza PostgreSQL tramite PGlite, separazione
  mostri/incantesimi, aggiornamento/ripristino, parametri SQL, autenticazione,
  validazione, fonti, lettori del catalogo, menu accessibile, eliminazione e rollback.
- Revisione indipendente: nessun rilievo importante residuo.

Nessun dato reale è stato salvato o eliminato durante questi controlli. Il
salvataggio attraverso la sessione amministrativa remota non è stato eseguito.
Questa modifica viene consegnata in preview; la pubblicazione in produzione
richiede una richiesta separata.
