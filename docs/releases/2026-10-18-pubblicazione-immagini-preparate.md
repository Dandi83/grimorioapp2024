# Pubblicazione delle immagini preparate

Daniele autorizza esplicitamente «Pubblica» il 18 ottobre 2026 alle 23:01, dopo la prova della preview completa. Branch `release/prepared-art-20261018`, base approvata `41d21d17afb7e8d45443e26501bd3efe117312e8`. Preview verificata READY: `dpl_5STju4eRXbyRU997rPZA2epY9EpR`.

La produzione di partenza è stata ricontrollata su `ilgrimorio.app`: commit `96138096486df4f4f4c7ae82baaf48676b1bcff7`, deployment `dpl_6npjg7EhTQB2DMqoZzQVwGso96NT`. Non ripristinare l'esperimento AVIF ritirato.

La modifica di rilascio abilita `getPreparedMonsterArt` anche in ambiente production, mantenendo identici selettore, immagini, segnaposto, risoluzioni e impostazioni WebP della preview. Aggiornato anche il template del generatore per conservare questa scelta nelle rigenerazioni future. Test modificato prima del codice: osservato fallimento sul mancato ritorno dell'immagine in produzione; dopo la modifica verifica parità con la preview per tutte le 336 immagini, e conserva l'esclusione degli ambienti di sviluppo.

La release comprende anche gli elenchi alleggeriti e gli stati di caricamento già presenti nella preview approvata. Non aggiunge altri cambiamenti grafici o funzionali. Nessuna modifica a dati amministrativi, database, crediti, consenso, statistiche, client iPhone o Capacitor. File applicativi modificati rispetto alla preview: `lib/prepared-monster-art.ts`, `scripts/prepare-monster-art.mjs`.

La build di produzione deve usare l'ambiente production, invece di limitarsi a riassegnare il dominio a una build con variabili preview. Verifiche: test per tutte le immagini, suite completa e build locale; dopo il deploy controllare dominio, commit effettivo, immagini statiche WebP e segnaposto, apertura schede, navigazione e preservazione dei conteggi. Il risultato di Vercel e la verifica del dominio determinano l'avvenuta pubblicazione, non questo documento preparatorio.

Coordinamento iPhone: nessun merge automatico; il client mobile rimane separato. La pubblicazione viene comunicata alla chat iPhone con commit, deployment e file condivisi. In caso di regressione il rollback applicativo noto è `9613809`, con foto e crediti preservati.
