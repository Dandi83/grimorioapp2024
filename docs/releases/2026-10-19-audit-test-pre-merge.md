# Audit dei controlli prima del merge

Richiesta di Daniele del 19 ottobre: spiegare i test adattati, verificare che i controlli ancora validi non siano indeboliti e, a esito positivo, integrare perf/lista-incantesimi in main e pubblicare in produzione.

Base produzione verificata: 59c5ffb. Head esaminato: 3e3c58e, più i controlli DOM aggiunti durante questo audit. Il main GitHub ad3364a è antenato del branch (0 commit esclusivi main, 56 nel branch): il merge riallinea anche lo storico già presente in produzione. Nessuna integrazione del filone mobile.

## Esito sulle asserzioni

Non è corretto dire letteralmente che nessuna riga assert sia stata rimossa: le asserzioni sulle props dei filtri server, sulle 400 righe immediatamente nel DOM e su precedenti scelte UI sono state sostituite quando è cambiato il comportamento approvato. Nessun requisito funzionale ancora valido viene eliminato o reso facoltativo. Nessun file di test o comando precedente della suite principale è stato rimosso, nessun test saltato per aggirare un errore.

In particolare:

- initialRaccolta=animali e initialGs=1/2, prima verificati sulle props di una pagina server, sono ora verificati sui risultati DOM esatti della raccolta Animali/GS 1/2.
- initialLivello=3 è ora incluso in un caso DOM con livello=3, scuola=Evocazione, classe=mago. Tre record indipendentemente errati per livello, scuola o classe devono essere esclusi. Il controllo discrimina ogni filtro, non usa soltanto fixture con la stessa scuola/classe.
- Il controllo di 400 incantesimi rimane dopo Mostra altri; aggiunti 40 iniziali, reset a cambio ricerca/filtro e ricerca dell'ultimo record dell'intero catalogo. Tastiera e separatori restano verificati.
- Il passaggio da attesa di prefetch=true a false sui Link della barra segue il lavoro idle richiesto; le chiamate effettive ai quattro percorsi, il cleanup e il timer 300 ms sono verificati separatamente nel DOM.

## File adattati nella parte prestazioni, rispetto a 59c5ffb

| File | Adattamento e garanzie |
| --- | --- |
| tests/catalog-list-payload.cjs | getSpellIndex al posto di getAllSpells; rendering diretto al posto di Suspense. Conservati ID, nomi, classi, metadati, animali, record manuali, immutabilità e corpi esclusi. Aggiunti SQL leggero, chiavi/TTL/tag, dati JSON e payload Preferiti. I filtri sono coperti dal test DOM. |
| tests/bestiario-browser-dom.cjs | 40 righe iniziali e raggiungibilità di tutti i 400 risultati; filtri URL via window/popstate, ricerca intera, tastiera e persistenza Preferiti. Aggiunti casi originali esatti con fixture discriminanti, HTML senza skeleton, prefetch una volta per riga, idle e fallback cancellabile. |
| tests/admin-editor-editions.cjs | Mock updateTag e verifica tag spells/monsters; invalidazione della scheda dopo cancellazione. Tutti i controlli di autorizzazione, validazione, edizioni, persistenza SQL e rollback conservati. |
| scripts/check-monster-favorites.mjs | Mock getSpellIndex, router e nuove props SpellRow. Nessuna asserzione funzionale rimossa: namespace, ordine numerico/alfabetico, dati invariati, preferiti misti e titoli senza bollini restano. |
| scripts/check-navigation.mjs | Mock router e controllo prefetch differito. Conservati numero/nomi dei link, selezione attiva, esclusione admin, navigazione legale e sezione dadi rimossa. |

## Altri adattamenti già nello storico pubblicato, visibili rispetto al vecchio main

| File | Motivo |
| --- | --- |
| scripts/check-manual.mjs | Conteggi fixture 330→340 e animali 95→100; contenuti delle condizioni confrontati senza differenze di markup/spaziatura introdotte dalla nuova formattazione. L'attesa del pannello riferimenti è sostituita dall'assenza di pannelli duplicati e da controlli dei riferimenti inline. Restano tutte le 58 voci, blocchi, fonti e destinazioni. L'indice Manuale non è più pubblico, mentre le condizioni lo sono: il vecchio link Home non è più un requisito valido. |
| scripts/check-srd-monster-sample.mjs | Conteggi aggiornati per le dieci creature 2014 e contesto di rendering per attribuzioni/condivisione. Conservati precedenza delle modifiche manuali, statistiche, testi e PX di Aboleth. |
| scripts/check-srd-monsters.mjs | Stessi conteggi aggiornati, nuove dipendenze di rendering e attesa Equipaggiamento al posto di Attrezzatura. Restano trascrizioni, hash/fonti, immutabilità, icone e campi; aggiunta assenza delle illustrazioni pubbliche. |
| tests/damage-icons.cjs | Solo aggiunte: paragrafi del lich, frequenze incantesimi, conservazione di tutte le parole e collegamenti con accenti; nessuna asserzione precedente rimossa. |

Anche check-navigation nello storico segue le scelte già pubblicate: nome Bestiario e spostamento del disclaimer dalla Home a Fonti. I controlli sono stati spostati sulla destinazione corretta, non cancellati.

## Test nuovi rispetto al vecchio main

Questi file sono stati aggiunti nello storico: non sostituiscono né eliminano vecchie suite.

| File | Copertura |
| --- | --- |
| tests/admin-editions.cjs | Persistenza edizioni, autorizzazione, separazione namespace, fonti verificate. |
| tests/admin-editor-editions.cjs | Salvataggi atomici di contenuto, metadati e campi aggiuntivi. |
| tests/admin-monster-editor.cjs | Modello dell'editor e conservazione dei testi sorgente. |
| tests/admin-monster-editor-dom.cjs | Interazioni reali dell'editor creature e anteprima. |
| tests/admin-spell-editor-dom.cjs | Interazioni editor incantesimi, bozze e fonti. |
| tests/analytics.cjs | Consenso, validazione, SQL, outbox, deduplica e conservazione. |
| tests/analytics-consent-dom.cjs | Nessun invio prima del consenso, revoca e lettura attiva. |
| tests/bestiario-browser-dom.cjs | Cataloghi, filtri, paginazione, Preferiti e prefetch. |
| tests/catalog-list-payload.cjs | Indici leggeri e conservazione dei dati degli elenchi. |
| tests/catalog-read-cache.cjs | React.cache nel renderer RSC reale: deduplicazione, ID distinti, aggiornamenti e assenti. |
| tests/legacy-monsters.cjs | Creature 2014, fonti, precedenza e separazione edizioni. |
| tests/monster-provenance.cjs | Attribuzioni, pagine, salvaguardie sulle modifiche manuali. |
| tests/monster-spell-links.cjs | Collegamenti alle schede incantesimo nelle creature. |
| tests/prepared-monster-art.cjs | Integrità e configurazione delle risorse grafiche approvate. |
| tests/share-button-dom.cjs | Condivisione, copia, annullamento e fallback manuale. |

Gli script nuovi check-legacy-live.py, prepare-monster-art.mjs, setup-codex-cloud.sh e transcribe-legacy-monsters.py servono rispettivamente alla verifica HTTP legacy, alla preparazione verificata delle risorse, al setup riproducibile e alla trascrizione legacy. Nessuno è un adattamento che elimina vecchie asserzioni. Nessuno script di trascrizione/seed/migrazione viene eseguito per il merge.

## Gate di rilascio

Prima del merge: npx tsc --noEmit, npm run test:catalog-performance e npm test rieseguiti, compresi i nuovi casi DOM. Lint escluso. Il codice applicativo non è cambiato rispetto alla preview READY 8254fc8, che aveva superato npm run build Vercel con 743 pagine statiche. Dopo il merge: attendere build produzione READY e verificare sul dominio ufficiale le risposte HIT per /grimorio, /bestiario e /spell/amicizia, e Amicizia nel testo HTML visibile di /grimorio.
