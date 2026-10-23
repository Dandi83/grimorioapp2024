# Occhio per singola scheda e righe admin intere — 23 ottobre 2026

Ramo `feat/occhio-schede-20261023`, base `main` 6894a09 (#71). Non unito: attende l'OK di Daniele.

## Occhio su ogni incantesimo e mostro
Serve a togliere temporaneamente una scheda dal sito senza eliminarla. Vale nel 2014 e nel 2024, anche per le schede lette dai file SRD.

### Dati
- Due tabelle nuove, create solo al primo cambio, come per le sezioni:
  - `grimorio_card_visibility`: tipo «incantesimo» o «mostro», id della scheda, nascosta sì/no, data, autore;
  - `grimorio_card_visibility_log`: una riga per ogni cambio, con nome ed edizione della scheda in quel momento.
- Si salva solo lo stato: nessuna riga nella tabella degli incantesimi o dei mostri, nessun testo toccato.
- `setCardVisibilityAction` (`app/actions/admin-cards.ts`):
  - parte con `requireAdmin`;
  - accetta solo id presenti nel catalogo pubblico, cioè database più file SRD.

### Area riservata
- In ogni riga di /admin/incantesimi e /admin/mostri, in tutte e due le edizioni, c'è un pulsante occhio accanto ad Apri e Modifica:
  - occhio aperto = visibile;
  - occhio barrato = nascosta.
- Un tocco cambia subito lo stato e mostra l'avviso «Nascosta dal sito · Annulla». Annulla ripristina lo stato precedente. Niente finestra di conferma.
- Le schede nascoste hanno la riga attenuata e la pillola scura «Nascosta».
- Il filtro «Tutte · Visibili · Nascoste · N» conta le schede nascoste dell'edizione scelta.
- Lo stesso occhio c'è in alto nell'editor della scheda.
- Il Registro mostra una riga per ogni cambio, per esempio «Incantesimi 2024 · visibilità», con il nome della scheda.

### Sito pubblico, quando una scheda è nascosta
La scheda è fuori da:
- /grimorio, /bestiario e la colonna dell'elenco sul computer;
- /api/catalogo/incantesimi e /api/catalogo/bestiario;
- l'indice di ricerca e quindi la ricerca della Home;
- i conteggi della Home sul computer;
- il laboratorio dei personaggi.

Inoltre:
- I rimandi dalle altre schede restano come testo semplice, senza collegamento; il riquadro «Passa alla versione 2014/2024» non compare.
- /spell/… e /mostro/… rispondono 404, con il titolo «non trovato».
- Nei Preferiti la scheda salvata resta come riga attenuata «Non disponibile al momento», senza collegamento. Torna normale quando la scheda è di nuovo visibile.
- Il service worker cancella dal telefono la copia salvata della scheda. Cambia anche la firma di /grimorio o /bestiario e delle loro schede, così le copie salvate prima del cambio vengono rifatte.
- L'amministratore loggato la vede dappertutto con la pillola «Nascosta». Sulla scheda compare «Nascosta · Il pubblico non vede questa scheda · Mostra».
- Effetto immediato, come per le sezioni: modalità anteprima per l'amministratore, `updateTag` e `revalidatePath` di tutte le pagine e dell'indice di ricerca.
- Sitemap: il sito non ne ha una, quindi non c'è nulla da cambiare.

Le condizioni non hanno collegamenti a incantesimi o mostri.

### Come è fatto
- Una scheda nascosta è indicata dal suo indirizzo (`/spell/<id>`, `/mostro/<id>`) nella stessa lista delle sezioni e delle parti nascoste.
- Per questo valgono le regole che esistono già:
  - `isHiddenPath` e `visibleLinks` per i collegamenti nei testi;
  - indice di ricerca;
  - service worker.
- `visibleCards`, `markedCards` e `cardHidden` (`lib/section-view.ts`) applicano lo stato a elenchi e schede.
- Senza schede nascoste gli elenchi passano invariati.

## Righe degli elenchi admin mai tagliate
- Il nome va a capo. Livello e scuola (o GS, tipo e taglia per i mostri) si leggono sempre interi.
- L'etichetta di fonte è una piccola pillola che va a capo da sola se non c'è spazio.
- Sul telefono i pulsanti Apri, Modifica, occhio e cestino, da 44 px ciascuno, stanno sotto il testo. Dai 640 px in su stanno a destra.

## Verifiche
- `tests/admin-access.cjs`:
  - azione rifiutata senza login, anche «Mostra»;
  - id inventati e tipi sbagliati rifiutati;
  - una scheda 2024, una 2014 dai file e un mostro nascosti;
  - nessun cambio registrato se lo stato è già quello;
  - Annulla e «Mostra»;
  - una riga di registro per cambio, con nome ed edizione;
  - un record per scheda.
- `tests/public-sections.cjs`:
  - regola degli indirizzi: solo quella scheda, non l'altra edizione né un id che la contiene;
  - collegamenti in testo semplice;
  - service worker;
  - tabelle scritte;
  - `requireAdmin` all'inizio dell'azione.
- `tests/schema-runtime-tables.cjs`: le tabelle nuove corrispondono a `schema.ts`.
- Prova nel browser «admin eye on single cards», sul database di prova locale:
  - nasconde Palla di fuoco (2024, database), Allarme (2014, file) e Aboleth;
  - controlla elenco, ricerca, indice, conteggi, /api/catalogo, 404, link nel Lich e Preferiti;
  - controlla che l'amministratore le veda, il Registro, il filtro e l'occhio nell'editor;
  - righe a 360, 375 e 390 px senza puntini;
  - ripristino finale con sito e indice identici a prima.
- Senza schede nascoste, il ramo è stato confrontato con `main` usando lo stesso database di prova:
  - indice di ricerca e /api/catalogo identici byte per byte;
  - pagine pubbliche identiche, salvo l'ordine di un meta tag tecnico di Next.
