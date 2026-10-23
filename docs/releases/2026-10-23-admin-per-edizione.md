# Area riservata divisa per edizione — 23 ottobre 2026

Ramo `feat/admin-edizioni-20261023`, base `main` b3fed03 (#67).

## Cosa cambia
- In cima a ogni pagina dell'area riservata c'è un selettore «2024 · 2014», con lo stesso stile del sito e pulsanti alti almeno 44 px.
- La scelta resta salvata nel cookie `__Host-grimorio_admin_edizione`, che viene impostato solo dopo il controllo del login. L'edizione predefinita è la 2024.
- Sotto il selettore c'è una fascia che resta in alto durante lo scorrimento:
  - 2024: bordeaux #7A1F2B, testo #FFFBF0, «Stai modificando: edizione 2024»;
  - 2014: blu #2D4C7A, testo #FFFBF0, «Stai modificando: edizione 2014».
- Le pagine comuni alle due edizioni sono Segnalazioni, Notifiche, Statistiche e Sezioni dell'app. Lì il selettore resta, ma al posto della fascia compare «Comune alle due edizioni».
- Nella pagina di login non ci sono né il selettore né la fascia.

## Con l'edizione scelta
- **/admin**:
  - ogni riquadro mostra quante voci ha quell'edizione (per esempio «Incantesimi · 388») e apre la sezione già filtrata;
  - il numero delle modifiche manuali e le etichette ambra dei riquadri contano solo l'edizione scelta;
  - il Manuale nella 2014 indica «Solo edizione 2024».
- **/admin/incantesimi e /admin/mostri**:
  - elenchi, ricerca e conteggi mostrano solo l'edizione scelta, con la stessa regola dell'elenco pubblico: incantesimi 2014 solo se etichettati 2014, mostri secondo `usesLegacyMonsterRules`;
  - la tendina dell'edizione di ogni scheda resta, ma prima di spostare la scheda nell'altra edizione chiede una conferma: «Spostare questa scheda nell'edizione 2014?»;
  - un incantesimo o un mostro nuovo parte dall'edizione scelta;
  - in alto nell'editor c'è l'etichetta dell'edizione.
- **/admin/contenuti/&lt;sezione&gt;**:
  - si apre sull'edizione scelta;
  - i link interni «2024 / 2014» sono stati tolti e li sostituisce il selettore;
  - una sezione che non ha quell'edizione (il Manuale nella 2014) lo dice e offre di passare all'altra;
  - un link con l'edizione diversa da quella scelta mostra un avviso.
- **Schede di modifica**:
  - in alto c'è l'etichetta «Edizione 2024» o «Edizione 2014»;
  - se la voce è dell'altra edizione (per esempio da un link diretto), la pagina lo dice e offre «Passa all'edizione …».
- **/admin/registro**:
  - mostra le righe dell'edizione scelta e quelle comuni, cioè sezioni mostrate o nascoste che non riguardano un'edizione;
  - le modifiche fatte con l'editor seguono l'edizione attuale della scheda;
  - l'opzione «Tutte le edizioni» mostra tutto.
- **Segnalazioni**: ogni segnalazione mostra l'etichetta dell'edizione della pagina segnalata, quando è nota.

## Cosa non cambia
- Nessun dato viene scritto: è solo un modo di filtrare e mostrare le voci.
- Le correzioni valgono sempre solo per la voce e l'edizione su cui sono fatte.

## Verifiche
- `tests/admin-edition.cjs`:
  - 2024 predefinita;
  - cookie impostato solo per l'amministratore e ricordato;
  - colori e testi della fascia;
  - pagine comuni;
  - regola degli incantesimi;
  - filtro del registro;
  - ogni voce contata per un'edizione si apre in quell'edizione.
- `tests/admin-monster-editor-dom.cjs`: un mostro nuovo parte dall'edizione scelta, con l'etichetta in alto.
- Prova nel browser «admin area by edition»:
  - selettore ricordato dopo il ricaricamento e colori della fascia;
  - conteggi dei riquadri uguali agli elenchi nelle due edizioni;
  - incantesimi solo dell'edizione scelta;
  - Manuale nella 2014;
  - link diretto a una voce dell'altra edizione;
  - conferma sullo spostamento, che con «Annulla» non salva nulla;
  - registro per edizione e «Tutte le edizioni»;
  - pagine comuni senza fascia;
  - 360, 375 e 390 px senza scorrimento orizzontale.
