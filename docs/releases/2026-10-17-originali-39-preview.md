# 39 descrizioni originali — preview 2026-10-17

## Richiesta approvata

Completare i 39 incantesimi vuoti con spiegazioni originali delle meccaniche
2024, senza trascrizioni integrali o parafrasi frase per frase. Asterisco
anche sui 39 nuovi testi, mantenendo i dieci precedenti.

## Contenuti e fonti

- 340 record SRD invariati (339 incantesimi distinti).
- 39 sintesi originali con dati e riferimenti 2024 per ogni record.
- 10 descrizioni preesistenti conservate senza modifiche.
- Totale atteso: 389 record, nessuna descrizione vuota, 49 asterischi.
- Le otto evocazioni di spiriti includono un riepilogo operativo delle
  statistiche e un collegamento alla scheda 2024 completa; non vengono
  presentate come trascrizioni integrali delle schede dei mostri.

Il dataset `lib/data/original-descriptions-2024.json` contiene per ciascun
incantesimo i collegamenti al compendio PHB 2024 Roll20 e al riscontro
pubblico consultato (AideDD; Wikidot per Portale arcano, Telepatia e
Parola del potere fortificare). Nessun acquisto o aggiramento di accessi.
Le descrizioni non sono etichettate come testi ufficiali o SRD.

Verificati: bersagli/visibilità, distanze, tipo e quantità dei danni,
tiri salvezza, condizioni e relative scadenze, attivazioni, concentrazione,
livelli superiori e crescita dei trucchetti. Distinte le meccaniche 2024
da quelle 2014 (fra cui Dardo stregato, punizioni, Nube di pugnali,
Percezione delle bestie e i nuovi spiriti).

Corretti nei soli 39 record i campi OCR incompleti: livelli mancanti,
tempi di lancio, componenti materiali troncate e durate con “l” al posto
di “1”. ID, titoli e preferiti restano invariati.

## Implementazione

Overlay di lettura, senza scritture o migrazioni nel database condiviso.
Una descrizione non vuota salvata da un redattore ha sempre precedenza.
Etichette e statistiche della sintesi vengono mostrate solo quando il
testo corrisponde esattamente alla versione del dataset.
Gli ID degli asterischi sono separati dai testi per non includere l’intero
dataset nei componenti client.

## Verifica

`npm test`: controlli SRD precedenti più 39 testi, marker, immutabilità,
precedenza delle modifiche, provenienza e sottotitoli gialli.
`npm run build`: compilazione e TypeScript riusciti.
`git diff --check`: riuscito.
Avviso npm preesistente sulla configurazione http-proxy; nessuna nuova
dipendenza o modifica alla configurazione di produzione.

La preview non costituisce garanzia assoluta di assenza di errori
redazionali; sono conservati i riferimenti per il confronto. Produzione
invariata fino all’approvazione della preview.
