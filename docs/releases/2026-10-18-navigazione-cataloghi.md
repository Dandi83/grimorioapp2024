# Prova mirata: apertura schede e cambio catalogo

Daniele chiarisce che il ritardo si verifica aprendo le schede e passando tra Incantesimi e Bestiario; dopo il caricamento lo scorrimento è normale. Non si interviene quindi su blur, scroll o statistiche. Produzione controllata: `9613809`, WebP dopo il ritiro AVIF. Base di lavoro: documentazione rollback `20ae06f`, con lo stesso codice applicativo della produzione. Branch `perf/catalog-list-payload-20261018`, solo anteprima da confrontare sul dispositivo prima della pubblicazione.

## Evidenze e intervento

Le due pagine inviavano ai browser client l'intero array di schede, comprese descrizioni integrali, azioni, tratti e altre informazioni non utilizzate da ricerca/filtri/righe. Ora i componenti elenco ricevono solo ID, nomi e campi effettivamente utilizzati. Le letture server e le schede di dettaglio restano complete; i record amministrativi e le modifiche salvate non vengono alterati.

Tipi dedicati `MonsterListItem` e `SpellListItem` limitano il contratto degli elenchi. ID, ordinamento, raccolte Mostri/Animali, colori, filtri e preferiti mantengono gli stessi valori. Il nuovo test esegue le vere pagine server, controlla esclusione dei corpi testuali dai props, metadati invariati, 100 animali, filtri iniziali e non mutazione delle sorgenti, inclusa una scheda amministrativa personalizzata. Fallimento riprodotto prima della modifica, poi test superato; aggiunto al comando `npm test`.

Introdotti `loading.tsx` nelle due liste e nelle due route di dettaglio, con stato accessibile e segnaposto statici senza animazioni. Questo abilita feedback/streaming durante le attese server; non garantisce che le foto o il database rispondano più rapidamente. Fonte tecnica consultata: https://nextjs.org/docs/app/getting-started/linking-and-navigating.

## Baseline e validazione

Richieste HTTP alla produzione con `Accept-Encoding: gzip`: Bestiario 115.264 byte, Incantesimi 128.564 byte. I tempi di questo ambiente non vengono presentati come misure su iPhone o come LCP. Il confronto dell'anteprima deve usare la medesima codifica e verificare conteggi e navigazione.

Nuovo test di regressione, suite completa preesistente e build: superati. Revisione React: serializzazione minima al confine server/client, nessun nuovo fetch lato client, nessun hook/effetto aggiunto, struttura accessibile dello stato di caricamento, nessuna modifica alle condizioni di consenso o ai dati condivisi.

Immagini WebP, risoluzioni, qualità e fonti invariate. Nessuna cache del database aggiunta: le modifiche amministrative mantengono il comportamento attuale. Client iPhone separato, nessuna pubblicazione in produzione durante questa prova.
