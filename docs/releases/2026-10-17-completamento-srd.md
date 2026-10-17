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

## Risultati verificati

- Commit applicativo: `7a84f3ad7029372faa948536c8588161bafe69cc`.
- Preview verificata: https://grimorioapp2024-n99pvghej-grimorio-app.vercel.app
- Deployment `dpl_FuJcq2JXuZRiNUruaBvdkcEuXpbq`: READY.
- Build Vercel: `node scripts/migrations/add-20-srd.mjs --verify && npm test && npm run build`, riuscita.
- Prova reale: 20 INSERT verificati, riesecuzione senza duplicati, modifica editoriale conservata, collisione rifiutata prima di scritture parziali, righe estranee invariate, ROLLBACK e impronta finale identica alla iniziale.
- Catalogo preview letto online: 389 schede, 340 trascrizioni esatte / 339 incantesimi distinti SRD, 39 descrizioni vuote preesistenti. Tutti i testi e i cinque campi metadati del dataset corrispondono al catalogo online.
- Tutte le 20 route nuove rispondono HTTP 200 con attribuzione SRD.
- Controllo browser desktop: Palla di fuoco con H3 oro `rgb(212,175,55)`; ricerca Levitazione, filtro 2° livello e apertura della scheda riusciti. Nessuna dichiarazione di test su iPhone reale.
- Revisione indipendente: nessuna criticità o difetto importante individuato; rigenerazione PDF e test verificati anche dal revisore.
- Produzione ricontrollata: sempre `794e75d031243bb9f1efdd72f7918df540b21ba8`, nessuna pubblicazione dei nuovi 20.

## Scelte adottate e conseguenze

- Proseguire nel checkout preview esistente, preservando le modifiche già pubblicate tramite connettore; confronto delle sole modifiche intenzionali contro la base remota. Rischio gestito: disallineamento Git locale/remoto.
- Aggiungere un accesso di sola lettura riservato alla preview, escluso dall'amministrazione: evita modifiche persistenti al database condiviso. Rischio gestito: differenze fra staging e righe definitive, confrontate con gli stessi campi della migrazione e verificate nella transazione reale.
- Mantenere COMMIT e pubblicazione separati, in attesa di approvazione, come nel piano accettato. Conseguenza: serve ancora l'autorizzazione al rilascio ufficiale.
- Il revisore aveva rinviato il giudizio su permessi/schema/rollback reali: la successiva build configurata li ha verificati. Operazioni amministrative di modifica/eliminazione dei nuovi record persistenti restano da controllare dopo il rilascio; anticiparle richiederebbe l'inserimento definitivo.
- Il revisore aveva rinviato route e UI: tutte le route sono state controllate online; UI desktop campionata su Palla di fuoco e Levitazione. Una regressione visiva su un'altra scheda resta possibile.
- Il revisore non ha riesaminato le modifiche storiche fuori dai venti nuovi incantesimi: sono state conservate, non reinterpretate. Rischio residuo: eventuali problemi storici non sono esclusi da questa revisione.
- Il confronto con il PDF è programmatico, non una nuova ispezione visiva di tutte le pagine. Rischio residuo: impaginazioni particolari non identificate dal confronto caratteri; le quindici tabelle e tutti i record superano la ricostruzione.

## Osservazioni minori rinviate

- La verifica dei campi inseriti nella migrazione è completa quando tutti i venti record mancano (caso corrente verificato). In un database parzialmente già popolato si potrebbe estendere il confronto ai soli nuovi ID; oggi quel confronto dettagliato è saltato per l'intero batch, pur restando attivi conteggi, collisioni, idempotenza e conservazione.
- I test automatici di staging coprono il helper, non tutta l'integrazione accessori/amministrazione. L'integrazione corrente è stata revisionata e le classi/livelli di tutti i venti record sono validi; aggiungere una regressione end-to-end specifica dell'esclusione amministratore resta un miglioramento futuro.
