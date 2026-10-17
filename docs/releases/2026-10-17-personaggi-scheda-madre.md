# Scheda personaggio — modello visivo SCHEDA MADRE

## Richiesta
Mantenere il risultato visivo del PDF caricato, con compilazione direttamente nell'app. Modifica circoscritta alla presentazione della scheda esistente; nessuna attivazione di account o database.

## Implementazione
- Quattro pagine A4 renderizzate dal PDF originale senza annotazioni, come base visiva, per conservare cornici, colori, impaginazione e attribuzione Dragons' Lair.
- 902 campi reali HTML (621 testi, 281 caselle); escluso un pulsante PDF privo di contenuto da compilare. Coordinate e dimensioni estratte dai widget del documento, nessuna ricostruzione approssimativa a colonne.
- Scheda originale come vista predefinita; gestione rapida precedente mantenuta. Pagina selezionabile, zoom con scorrimento confinato e campi evidenziabili.
- Nome, classe/livello, specie, background, caratteristiche, TS e competenze, PF, CA, movimento, attacchi principali, monete, note e massimi slot condivisi col modello esistente.
- Gli altri campi sono liberi e conservati in paperFields, inclusi export JSON e snapshot. Correzioni manuali ai valori derivati nella vista cartacea restano specifiche di quella vista; nessuna promessa di automazione completa.
- Stampa delle quattro pagine tramite browser, senza menu dell'app; la stampa è una copia statica, non un PDF AcroForm compilabile esportato.
- Terminologia e riferimenti della scheda originale del 2017 conservati: non viene presentata come scheda ufficiale SRD 2024. Dati dell'app continuano a usare Specie/SRD 2024.

## Verifiche
Test del ponte dati e del layout: 902 nomi univoci, coordinate all'interno delle pagine, quattro immagini esistenti, nomi e caratteristiche, TS, PF, classe/livello, monete, campi liberi, false/true nelle caselle. TypeScript, suite esistente e build webpack superati. Review indipendente: 902 campi senza sovrapposizioni sostanziali; corretto il reset del contenitore esterno in stampa. La stampa su browser/dispositivo reale resta da verificare.

## Limiti mantenuti
Anteprima dimostrativa, dati soltanto in memoria della sessione; non persistenti dopo reload/chiusura. Account privati e sincronizzazione ancora da attivare con database separato. Nessuna migrazione o scrittura DB, nessuna pubblicazione in produzione.
