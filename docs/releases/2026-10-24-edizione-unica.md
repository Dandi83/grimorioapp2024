# Una sola edizione per tutta l’app — 24 ottobre 2026

Ramo `feat/edizione-unica-20261024`, base `main` 481c4c3 (#73). Non unito: attende l’OK di Daniele.

## Dove vive la scelta
- `lib/user-edition.ts` (puro, provato in `tests/user-edition.cjs`):
  - la chiave `grimorio.edizione` (2024 o 2014);
  - la lettura delle vecchie chiavi;
  - l’edizione imposta quando l’altra è nascosta.
- `components/edition/edition-provider.tsx`: un solo stato condiviso, messo nel layout principale.
  - `useUserEdition()` dà a tutte le pagine l’edizione, se è già stata scelta, e `choose()` per cambiarla.
  - Il valore viene letto dal dispositivo dopo il caricamento, quindi le pagine fatte dal server (e salvate offline) restano quelle di prima.
  - Il cambio vale subito per tutte le pagine aperte. Le altre schede del browser lo ricevono con l’evento `storage`.
- Chi la usa:
  - Incantesimi e Bestiario (`components/catalog-browsers.tsx`, `grimorio-browser.tsx`, `bestiario-browser.tsx`);
  - le pagine del Compendio, tramite `components/equipment/use-equipment-edition.ts`: Classi, Condizioni, Oggetti magici, Armi, Armature, Equipaggiamento d’avventura, Strumenti;
  - la ricerca della Home;
  - la colonna dell’elenco sul computer;
  - i conteggi della Home.
  - Avanzamento non ha un selettore: le regole sono le stesse nelle due edizioni.
  - Il laboratorio dei personaggi (solo anteprima) segue le regole 2024 come prima.
- I selettori 2024 · 2014 restano dove sono, ma cambiano l’edizione di tutta l’app.
- Un indirizzo con un’edizione esplicita apre quell’edizione senza cambiare la tua. Vale per `/spell/…-2014`, `/mostro/…-2014`, `?edizione=2014` e per il link «Incantesimi del…» della scheda di una classe. Se poi tocchi il selettore, l’edizione cambia e l’indirizzo perde il suo `?edizione=`.
- Area riservata: tiene il suo selettore e il suo cookie (#68), indipendenti da questa scelta.

## Vecchie chiavi
`grimorio.incantesimi.edizione`, `grimorio.bestiario.edizione` e `grimorio.equipaggiamento.edizione`. La chiave di Equipaggiamento era usata anche da Condizioni, Oggetti magici e Classi.
- Le chiavi presenti dicono tutte la stessa edizione (anche una sola): l’app la adotta in silenzio, la scrive in `grimorio.edizione` e non mostra il primo avvio.
- Le chiavi mancano tutte, oppure non sono d’accordo tra loro: il primo avvio compare una volta.
- Le vecchie chiavi non vengono più lette né scritte. Restano sul dispositivo, così tornare alla versione precedente non perde le scelte.

## Edizione nascosta da /admin/sezioni
- Se il 2014 (o il 2024) è nascosto in tutte le sezioni visibili che hanno edizioni, per il pubblico vale l’altra edizione:
  - il primo avvio non compare;
  - la pillola non si apre (resta un’etichetta);
  - la ricerca contiene solo quell’edizione.
- Se una sola sezione nasconde un’edizione, quella sezione mostra l’altra come già faceva prima. La scelta resta disponibile per le altre sezioni.
- L’amministratore non è vincolato: vede le edizioni nascoste con l’etichetta, come prima.

## Primo avvio
- Compare solo se la visita comincia dalla Home (non con `?cerca=`) e l’edizione non è ancora scelta. Mai sopra un link diretto: lì si parte dal 2024 e non si salva niente.
- Schermata a tutto schermo sopra la biblioteca, con velo scuro dall’alto verso il basso. Contiene:
  - il logo;
  - il titolo da 40 px;
  - due pulsanti da 104 px: bordeaux per il 2024, blu #2D4C7A per il 2014;
  - la riga «Puoi cambiarla quando vuoi dalla Home.»
- Accessibilità: è un dialogo con titolo, il focus va sul primo pulsante, il Tab resta dentro, Esc vale 2024 e la schermata non torna.
- La aggiunge solo il browser: l’HTML della Home resta quello normale per i motori di ricerca e per le anteprime dei link.

## Pillola e pannello
- Telefono e tablet: in alto a destra sulla foto della Home.
- Computer: nella colonna di sinistra sotto il logo, su tutte le pagine pubbliche.
- Testo «Edizione 2024 ⌄» (bordeaux) oppure «Edizione 2014 ⌄» (blu), alta 44 px. Compare solo dopo la lettura del dispositivo.
- Il pannello si apre dal basso sul telefono e come riquadro sotto la pillola sul computer. Contiene:
  - la maniglia;
  - «La tua edizione» e la sua riga;
  - le due scelte, con quella attiva piena e con la spunta;
  - la riga di stato «Ora tutta l’app parte dal 2014.» (letta dagli screen reader);
  - il pulsante «Fatto».
  Si chiude con Esc o toccando fuori.

## Ricerca e conteggi della Home
- Il campo dice «Cerca nel Grimorio 2024…» (o 2014).
- Prima compaiono i risultati della tua edizione, cioè quelli presenti in tutte e due le edizioni o solo nella tua.
- In fondo c’è «Cerca anche nel 2014 (N)», che mostra il blocco «Solo nel 2014».
- L’indice segna in un sesto campo (`"2024"` o `"2014"`) i risultati che esistono in una sola edizione:
  - `lib/search-index.ts`, `mergeEditions`;
  - il controllo `scripts/check-client-bundle.mjs` accetta solo questi due valori;
  - le sezioni dell’indice non nominano più una chiave di memoria.
- Un risultato solo 2024 di una pagina condivisa dalle due edizioni (Compendio), aperto da chi gioca 2014, si apre con `?edizione=2024`.
- Le scorciatoie della Home sul computer dicono «Incantesimi · 388 del 2024» o «… 319 del 2014». Il server scrive i numeri del 2024; il browser mostra quelli della tua edizione.

## Verifiche
- `tests/user-edition.cjs`:
  - migrazione delle vecchie chiavi;
  - edizione imposta dall’admin;
  - primo avvio: solo dalla Home, focus, Esc, non ricompare;
  - pannello: stato, focus, Esc;
  - cambio da un’altra scheda.
- Aggiornati:
  - `tests/bestiario-browser-dom.cjs` (la chiave nuova; un indirizzo con edizione non la cambia);
  - `tests/search.cjs` (i risultati di una sola edizione, `splitByEdition`, gli indirizzi).
- Nel browser, `e2e/edizione.spec.mjs`:
  - primo avvio e tutte le sezioni in 2014;
  - ricerca;
  - vecchie chiavi;
  - un’altra scheda;
  - indirizzi espliciti;
  - tastiera;
  - telefono.
- `e2e/sezioni.spec.mjs` copre il 2014 nascosto in tutte le sezioni, solo sul database di prova locale.
- Le altre prove nel browser simulano chi ha già scelto il 2024.
