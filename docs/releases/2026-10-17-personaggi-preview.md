# I miei personaggi — anteprima interattiva

Base: preview/personaggi-20261017, commit e9d6dac8beb13d5c2f75f634e20edfb01388cef5.

## Disponibile
- Accesso dalla Home, elenco di più personaggi e compilazione in due passaggi.
- Scheda: In gioco, Caratteristiche, Capacità, Incantesimi, Inventario, Note.
- Valori derivati, competenze e maestria, iniziativa e parametri magici con correzioni manuali.
- PF temporanei consumati prima di quelli attuali, guarigione limitata al massimo; condizioni e riferimenti SRD.
- Attacchi e risorse manuali, slot, conosciuti/preparati, oggetti e monete, diario.
- Esportazione JSON, versioni manuali (massimo 20 per scheda) e ripristino nella sessione di prova.
- Memoria React nel layout: navigando internamente e tornando alla scheda i dati restano; un ricaricamento/chiusura li elimina. Avviso beforeunload.

## Limite esplicito
L'anteprima è dimostrativa: nessun account personale, nessun salvataggio automatico persistente, nessuna sincronizzazione o recupero account. Non usare come archivio reale. Il codice non invia le schede al server né a localStorage.
Le variabili DATABASE_URL del progetto Vercel hanno lo stesso scope production/preview/development e non vi è un override preview dedicato. In base alla specifica non vengono eseguite migrazioni sul database condiviso. Per il backend approvato serve prima un database isolato; la funzione completa resta aperta.

## Verifica
- Test modello: soglie competenza 1,4,5,9,13,17,20; punteggi dispari e negativi; maestria; limiti e NaN/Infinity; danni con PF temporanei; ID distinti; normalizzazione input numerici/nome.
- TypeScript e suite preesistente eseguiti.
- Review indipendente: corretti navigazione Back (stato nel provider persistente del layout), testo lungo (wrapping), draft numerico frazionario (stesso clamp intero del modello), nome vuoto (commit su blur e blocco conferma vuota).
- Preview e account restituiscono 404 nell'ambiente production.
- Browser mobile locale non avviabile nel runtime; nessuna dichiarazione di QA su iPhone reale.

## Produzione
Nessuna scrittura DB, nessun acquisto, nessuna promozione in produzione. Dati e cataloghi SRD invariati.

## Verifica browser eseguita
Preview verificata: https://grimorioapp2024-9xqm13rfd-grimorio-app.vercel.app/personaggi (commit 21b3e3ea203947213a5b84b3c767d0c2ec4870bc, READY, target preview).
Creazione Aria delle Brume (Guerriero/Umano), elenco di due personaggi, PF temporanei 5 e danni 8: PF 16 → 13 e temporanei 0; guarigione limitata al massimo; snapshot e ripristino; consumo slot livello 1; ricerca/aggiunta Dardo incantato; navigazione Home → Indietro conserva elenco; Forza 10.5 normalizzata a 10. Esportazione JSON scaricata. Screenshot della scheda: personaggi-preview.jpg.
