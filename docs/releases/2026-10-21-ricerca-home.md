# Ricerca generale in Home (21 ottobre 2026)

## Home

- La Home resta com'era. Sotto la frase «Il sapere è la più potente delle magie.» c'è ora il campo «Cerca in tutto il Grimorio…»: pillola alta 54 px, carta #FFFBF0, bordo #CDBB96, lente bordeaux, ombra leggera.
- Sotto il campo, 3 ricerche rapide: «palla di fuoco», «avvelenato», «spada lunga».
- Il codice del pannello arriva dopo la Home, quando il browser è libero; l'indice si scarica solo all'apertura del pannello.

## Pannello a tutto schermo

- **Campo e chiusura**: campo con bordo bordeaux 2 px, cursore già nel campo, «Annulla» che torna alla Home.
- **Filtri a pillole**: Tutto più le sole sezioni pubbliche presenti nell'indice. Il Manuale compare solo dove è pubblicato (anteprima).
- **Campo vuoto**: «Prova a scrivere…» con 5 esempi.
- **Risultati**:
  - compaiono mentre si scrive e sono raggruppati per sezione, con contatore;
  - righe da almeno 52 px, parte scritta evidenziata, etichetta ricavata dai dati;
  - al massimo 8 per gruppo, poi «Mostra tutti (N)»;
  - nessun risultato: «Nessun risultato per «…»».
- **Testo nell'indirizzo** (`/?cerca=…&sezione=…`): tornando indietro da una scheda la ricerca riappare con il testo scritto.
- **Accessibilità**: dialogo modale, gruppo dei filtri con `aria-pressed`, numero dei risultati in un'area `aria-live`, campo a 17 px (niente zoom su iPhone).

## Come cerca (`lib/search.ts`)

- Maiuscole, accenti e apostrofi ignorati.
- Il testo deve iniziare una parola del nome: «dra» trova «Forma di drago» e «Drago rosso».
- Prima i nomi che iniziano con il testo, poi in ordine alfabetico; basta 1 carattere.
- Lo stesso nome nelle due edizioni è un solo risultato, che apre l'edizione scelta nella sezione. Le chiavi sono quelle già usate da Incantesimi, Bestiario ed Equipaggiamento.
- Un nome che esiste solo nel 2014 porta «· 2014» nell'etichetta (es. Canestro, Piuma magica).

## Indice (`lib/search-index.ts`, `/ricerca-indice.json`)

- Una sola lista, `SEARCH_SOURCES`, con un commento in testa che spiega come aggiungere una sezione.
- Ogni riga contiene solo nome, etichetta e indirizzo, mai il testo.
- Incantesimi e mostri vengono dagli stessi elenchi dei cataloghi (database), le altre sezioni da `lib/data`. Così ogni indirizzo esiste.
- Generato con la build e aggiornato ogni 5 minuti come le pagine degli incantesimi.
- Il controllo di build (`scripts/check-client-bundle.mjs`) controlla anche l'indice: nessun testo completo, celle brevi.
- Offline: il service worker lo scarica all'installazione e lo aggiorna a ogni apertura (prima la rete, poi la copia salvata).

## Test

- **Unitari** (`tests/search.cjs`): normalizzazione, ordinamento, soglia, limite 8 ed espansione, unione delle edizioni, righe senza nome o indirizzo, indirizzi verificati sui dati, conteggi per sezione.
- **Nel browser**: ricerca completa, tutti gli indirizzi dell'indice con risposta 200, offline in modalità aereo.
