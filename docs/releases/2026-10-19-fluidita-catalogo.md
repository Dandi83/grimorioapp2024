# Fluidità del catalogo — 19 ottobre 2026

Richiesta di Daniele: intervenire sui tre punti emersi dal video iPhone: attesa nell'apertura delle schede, costo degli elenchi lunghi, sfocatura delle barre.

Base web: produzione `dc36bd670f8d2d727daf7ac01f0dff9a2b39882e`, senza illustrazioni pubbliche delle creature. Branch di lavoro `fix/catalog-fluidity-20261019`. Nessuna modifica ai dati reali. Ramo iPhone verificato separatamente a `e22f06ea8270cc632d59a57ef2c2021e780b6bb2`; nessuna integrazione automatica.

## Interventi

- `getMonsterById` e `getSpellById` usano `React.cache`: metadati e pagina condividono la lettura nella singola richiesta. Restano le letture parallele di contenuto, edizione e campi aggiuntivi. Nessuna cache persistente o TTL: la richiesta successiva rilegge gli aggiornamenti amministrativi.
- Righe degli elenchi mostri, animali e incantesimi con `content-visibility: auto`, altezza stimata e memoria della misura reale. Il browser può saltare layout e disegno dei contenuti fuori schermo. Tutti i record rimangono nel DOM, nella ricerca e nell'albero di accessibilità: **non è virtualizzazione React e non riduce il numero di nodi o il costo della loro creazione**. La scelta conserva i link, l'ordine di tabulazione e il ripristino nativo dello scorrimento senza un nuovo gestore JavaScript. Stima separata per i gruppi di livello; rendering completo in stampa. Browser non compatibili mantengono l'elenco ordinario.
- Sfondi pieni e nessuna sfocatura per intestazioni dei due elenchi, navigazione inferiore e pulsanti delle schede. Colori e dimensioni conservati.
- Segnaposto di caricamento distinto per scheda creatura e incantesimo, con spaziatura iniziale e griglia delle statistiche. Riduce la differenza strutturale rispetto al vecchio segnaposto generico; non elimina l'attesa di rete e non garantisce layout shift nullo.

File condivisi con un futuro client mobile: `lib/monsters.ts`, `lib/spells.ts`, `app/globals.css`, i browser degli elenchi e i componenti pubblici di navigazione/caricamento. Trasferire soltanto tramite integrazione esplicita.

## Verifiche e limiti

- Test RSC reale con il renderer server incluso in Next: letture concorrenti/sequenziali dello stesso ID deduplicate, ID diversi indipendenti, modifiche visibili nella richiesta successiva, record mancanti correttamente restituiti. Nel caso metadati + pagina: 3 letture anziché 6 per creatura, 2 anziché 4 per incantesimo, nell'ambito della singola richiesta.
- Test DOM degli elenchi: 240 mostri, 100 animali, raccolte/ricerca/filtri; 400 incantesimi di prova, gruppi, ultimo risultato raggiungibile tramite ricerca e tastiera.
- Suite completa `npm test`, build Next e controllo diff: riusciti localmente. Test aggiuntivo `npm run test:catalog-performance` riuscito; la verifica RSC è anche nel `posttest` per le esecuzioni future della suite.
- Il DOM di prova non misura layout, disegno o frame rate WebKit. Nessun benchmark di fluidità iPhone eseguito. Nessun accesso alternativo al sito bloccato dal controllo di autorizzazione del browser.
- La prima richiesta dipende ancora da rete e database. Non dichiarare risolti tutti gli scatti senza una nuova prova sul dispositivo di Daniele.

Riferimenti: https://nextjs.org/docs/app/api-reference/functions/generate-metadata e https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility.
