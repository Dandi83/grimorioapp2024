# Completamento dei 339 incantesimi SRD — preview

## Contenuto

- 20 nuove schede elencate in `lib/data/srd-additions-20261017.json`.
- 340 record SRD / 339 incantesimi distinti (duplicato storico Respirare sott'acqua conservato).
- Le 320 trascrizioni precedenti restano identiche.
- Testi e metadati estratti dal PDF ufficiale italiano 5.2.1 con SHA256 verificato; fonte, attribuzione e licenza preservate.
- 109 sezioni di slot superiori renderizzate come sottotitolo giallo.

## Confine preview / produzione

La preview usa lo stesso database della produzione. Per questo i venti record sono aggiunti **in sola lettura alla consultazione preview**, senza INSERT persistenti. `getAllSpells({includePreview:false})` evita di proporre schede virtuali nel pannello amministratore. Le righe reali del database hanno sempre precedenza.

In produzione non esiste alcun fallback: le nuove schede saranno righe normali dopo l'inserimento autorizzato, modificabili/eliminabili dal pannello. Eliminazioni successive non vengono annullate dalle normali build o richieste.

## Verifica transazionale

Comando nell'ambiente Vercel configurato del progetto:

`node scripts/migrations/add-20-srd.mjs --verify`

Esegue e annulla l'inserimento; controlla tutti i campi, riesecuzione senza duplicati, conservazione di modifiche editoriali, collisioni ID/nome e impronta delle righe estranee. Il database finale deve essere identico a quello iniziale.

## Inserimento definitivo — solo dopo approvazione

`node scripts/migrations/add-20-srd.mjs --apply`

Richiede ambiente production e VERCEL_PROJECT_ID corretto; usa esclusivamente DATABASE_URL già configurata. Transazione unica, blocco breve sulla tabella (timeout 5 secondi), soli INSERT dei venti ID mancanti, nessun UPDATE/DELETE delle righe esistenti. Un nome inatteso per uno degli ID blocca tutto il batch. Una riesecuzione preserva integralmente righe già presenti e modifiche successive.

Non collegare `--apply` alle normali build. Per la pubblicazione autorizzata usare un override di build della sola distribuzione di rilascio, poi mantenere `npm run build` nelle distribuzioni future. Non esporre credenziali e non aggiungere endpoint amministrativi pubblici.

Conteggio atteso dopo la prima applicazione, salvo modifiche concorrenti: **389 schede complessive**, di cui 340 con trascrizione SRD, 10 descrizioni preesistenti fuori SRD e 39 ancora vuote.

Un rollback del codice Vercel non annulla gli INSERT nel database. Non rimuovere automaticamente le nuove righe: prima controllare eventuali modifiche editoriali e preferiti.
