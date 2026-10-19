# Primo accesso: liste visibili e schede pregenerate

Branch `perf/lista-incantesimi`, base `4ee2361`, codice `8254fc85799e8bdc51a7d5300d43610aa4bbeac8`. Solo anteprima: https://grimorioapp2024-fq50acu8s-grimorio-app.vercel.app, deployment `dpl_7eX6kb3gNRC3ZmBM4B478V4wrwHH`, READY, regione iad1. Nessun merge, deploy produzione, migrazione o scrittura ai dati reali. Produzione ricontrollata invariata a `59c5ffb` / `dpl_Hf6MBCyxEghp1U1bEUe7Hg93kPRp`.

## Origine esatta dello skeleton

Il testo «Caricamento in corso…» è in `components/catalog-loading.tsx`. Prima di questo intervento era richiamato da:

- `app/grimorio/loading.tsx` e `app/bestiario/loading.tsx` durante le transizioni.
- Il fallback Suspense in `app/grimorio/page.tsx` e `app/bestiario/page.tsx`: `useSearchParams` in `components/catalog-browsers.tsx` causava il bailout del contenuto della lista nel prerendering statico.
- `app/spell/[id]/loading.tsx` e `app/mostro/[id]/loading.tsx` richiamavano la variante dettaglio, con «Caricamento incantesimo» / «Caricamento creatura». Le schede venivano generate alla prima visita per via di generateStaticParams vuoto.

Conferma HTTP sulla precedente preview `4ee2361`: HTML visibile di /grimorio senza Amicizia, zero link /spell/, skeleton presente. Il parser esclude script e style: non conta i nomi presenti soltanto nel payload JSON.

## Intervento limitato al primo accesso

Tolti useSearchParams e Suspense dalle due liste. Il client viene prerenderizzato senza filtri; useEffect legge window.location.search al montaggio e dopo render dovuti alla navigazione. Un listener popstate aggiorna anche il ritorno/avanti; il cambio dei parametri reinizializza i filtri. Sono preservate ricerca, preferiti, catalogo completo e paginazione esistente a 40 righe per gli incantesimi: non è stata trasformata in una lista DOM di 389 righe.

Rimosse le quattro boundary loading.tsx indicate: altrimenti potrebbero mostrare ancora lo skeleton quando la richiesta di prefetch non è conclusa. Durante l'eventuale attesa di rete la transizione conserva la pagina precedente.

BottomNav programma router.prefetch di /, /grimorio, /bestiario, /preferiti con requestIdleCallback e fallback setTimeout 300 ms, con cleanup. I Link della barra hanno ora prefetch=false per lasciare l'avvio al lavoro programmato. Anche le righe conservano prefetch=false: onTouchStart e onMouseEnter avviano il prefetch una sola volta per riga tramite ref.

Tutti gli ID vengono restituiti da generateStaticParams. Incantesimi usa l'indice leggero già in cache. Poiché non esisteva un indice persistente degli ID creature, aggiunto `lib/monster-index.ts`: conserva solo gli ID del catalogo esistente, inclusi record amministrativi e virtuali. Il tag monsters viene invalidato dai salvataggi/cancellazioni. Su entrambe le schede rimangono revalidate=300 e dynamicParams=true, per continuare a servire anche ID creati dopo la build.

## Verifiche

Eseguite nell'ordine:

1. `npx tsc --noEmit`: PASS.
2. `npm run test:catalog-performance`: PASS.
3. `npm test`: PASS, incluso posttest RSC.
4. `npm run build`: PASS nell'ambiente Vercel configurato con il catalogo esistente; comando confermato nel log del deployment. Non è una build locale priva di database.

Lint saltato, nessuna dipendenza installata. `git diff --check`: PASS.

Adattamenti dei test al comportamento richiesto:

- catalog-list-payload: il componente viene verificato direttamente anziché come figlio di Suspense; preservati payload leggero, ID, metadati, animali e record manuali.
- bestiario-browser-dom: usa window.location e popstate al posto del doppio di useSearchParams. Conservati filtri URL e navigazione sullo stesso percorso; aggiunte verifiche di rendering server senza skeleton, prefetch touch/hover una volta per entrambe le righe, lavoro idle, cancellazione e fallback a 300 ms.
- check-navigation: verifica prefetch=false sui Link (avvio ora differito); mock router necessario per il rendering isolato. I quattro link e la selezione attiva restano verificati.
- check-monster-favorites: aggiunto il router al contesto simulato, senza cambiare controlli su preferiti, ordinamento o namespace.
- admin-editor-editions: verifica invalidazione di entrambi gli indici, conservando il controllo del tag spells e le verifiche di persistenza/rollback.

## Build prima e dopo

Confronto sullo stesso indicatore del log Vercel, con build cache esistente:

| Indicatore | Prima: 4ee2361 | Dopo: 8254fc8 |
| --- | --- | --- |
| Build Completed in /vercel/output | 9 s | 39 s |
| Generazione statica | 483 ms | 19,8 s |
| Worker generazione | 1 | 1 |
| Pagine statiche totali | 12 | 743 |
| Schede incantesimo pregenerate | 0 | 389 |
| Schede creatura pregenerate | 0 | 342 |

Le 342 creature sono quelle effettivamente presenti nel catalogo al momento della build, inclusi record amministrativi: non è stato forzato il conteggio storico delle fixture. Nessun errore di connessione, nessuna riduzione degli ID e nessun ritorno all'array vuoto necessari.

Estratto originale del log:

```text
├ ○ /bestiario                            5m      1y
├ ○ /grimorio                             5m      1y
├   /mostro/[id]
│ ├ ● /mostro/aboleth                     5m      1y
│ ├ ● /mostro/albero-risvegliato          5m      1y
│ ├ ● /mostro/alce                        5m      1y
│ └ ● [+339 more paths]
└   /spell/[id]
  ├ ● /spell/aculeo-mentale               5m      1y
  ├ ● /spell/aiuto                        5m      1y
  ├ ● /spell/allarme                      5m      1y
  └ ● [+386 more paths]
✓ Generating static pages using 1 worker (743/743) in 19.8s
Build Completed in /vercel/output [39s]
```

## HTML della nuova anteprima

Risposte HTTP 200 PRERENDER, analizzate senza eseguire JavaScript e scartando script/style:

| Percorso | Nome nel testo HTML | Link schede nell'HTML | Skeleton |
| --- | --- | --- | --- |
| /grimorio | Amicizia presente | 40 (prima pagina esistente) | assente |
| /bestiario | Aboleth presente | 242 (raccolta Mostri predefinita) | assente |

H1: Incantesimi (389), Bestiario (342). Le altre 100 creature sono nella raccolta Animali, accessibile dal client. Nessun dato personale dei Preferiti incorporato nel prerendering. Il controllo dei filtri dopo montaggio è stato eseguito nei test DOM; non è una prova su iPhone fisico.

## File modificati, creati o rimossi

Modificati:
- app/actions/admin-monsters.ts
- app/bestiario/page.tsx
- app/grimorio/page.tsx
- app/mostro/[id]/page.tsx
- app/spell/[id]/page.tsx
- components/bottom-nav.tsx
- components/catalog-browsers.tsx
- components/monster-row.tsx
- components/spell-row.tsx
- scripts/check-monster-favorites.mjs
- scripts/check-navigation.mjs
- tests/admin-editor-editions.cjs
- tests/bestiario-browser-dom.cjs
- tests/catalog-list-payload.cjs
- docs/continuita-progetto.md

Creati:
- lib/monster-index.ts
- docs/releases/2026-10-19-primo-accesso-senza-skeleton.md

Rimossi:
- app/grimorio/loading.tsx
- app/bestiario/loading.tsx
- app/spell/[id]/loading.tsx
- app/mostro/[id]/loading.tsx
