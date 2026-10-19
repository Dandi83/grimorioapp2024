# Cache di navigazione — piano di implementazione

Base verificata: b0579c4, branch perf/lista-incantesimi. Implementazione diretta nella sessione, autorizzata da Daniele. Solo preview, niente lint, merge, produzione, migrazioni o scritture ai dati reali.

## Obiettivo e scelte

Ridurre le richieste durante la consultazione. Cache router 300 secondi per pagine statiche e dinamiche; ISR 300 secondi per elenchi e schede. Schede generate alla prima visita, senza leggere tutte le schede in build. Conservare React.cache per deduplicare metadati e pagina. I valori di 300 secondi sono una scelta operativa comunicata in questa sessione: il testo integrale del messaggio precedente non è stato recuperato.

## Passi

- [x] Rendere /grimorio, /bestiario e /preferiti prerenderizzabili. Leggere i parametri URL nei client dentro Suspense, aggiornando i filtri anche a navigazione client sullo stesso percorso; conservare paginazione, ricerca e preferiti. Preferiti riceve solo i dati degli elenchi.
- [x] Attivare ISR per /spell/[id] e /mostro/[id], generateStaticParams vuoto. Invalidare anche la scheda dopo cancellazione creatura; conservare invalidazione esistente dei salvataggi e delle edizioni.
- [x] Prefetch completo per i quattro collegamenti della barra; disattivare prefetch automatico delle righe per evitare richieste per centinaia di schede.
- [x] Adattare i test che presupponevano parametri server. Verificare URL iniziale, cambio query sullo stesso percorso, URL senza filtri, ricerca/paginazione/preferiti, payload ridotto e invalidazione.
- [x] Eseguire nell'ordine npx tsc --noEmit, npm run test:catalog-performance, npm test; quindi build Vercel in preview, HTTP cache HIT per elenchi e schede, metadati regioni e produzione invariata.

## Regioni e verifica

Produzione Vercel dpl_Hf6MBCyxEghp1U1bEUe7Hg93kPRp: iad1. PGHOST dell'integrazione Neon: suffisso us-east-1.aws.neon.tech. Regioni coerenti (Virginia); nessuna migrazione geografica necessaria. Il branch mobile remoto rimane e22f06e.

## Rischi da coprire

Filtri condivisi dopo cambio query; preferiti locali mai incorporati nella pagina statica; 404 rigenerate dopo creazione; cancellazione e modifica invalidano ISR; prefetch massivo delle schede evitato. La cache del browser di un altro visitatore può restare valida fino alla scadenza; gli update non sono push a sessioni aperte.

Verifica locale: tsc, performance e npm test passati. Revisione indipendente senza rilievi sostanziali. La suite Preferiti è stata adattata a getSpellIndex; invarianti originali preservati.

Preview codice 794f55b READY; build Vercel e HTTP cache verificati. Limite: Chromium assente, prova browser reale non eseguita. Produzione invariata. Risultati nel registro release.
