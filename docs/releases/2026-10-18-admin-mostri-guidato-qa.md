# Inserimento guidato dei mostri — preview

Il modulo amministrativo dei mostri ora raggruppa identità, combattimento,
caratteristiche e dettagli facoltativi. Tratti, azioni, reazioni e azioni
leggendarie si compilano con blocchi «Nome + Descrizione», aggiungibili,
riordinabili ed eliminabili prima del salvataggio. La descrizione usa un
editor visuale; i pulsanti applicano grassetto e corsivo al testo selezionato
oppure rimuovono l’enfasi dall’intera descrizione. Non occorre scrivere HTML.

L’anteprima usa `MonsterText`, i divisori e i richiami arrotondati già approvati.
Non richiama azioni di salvataggio. I modificatori di caratteristica si
aggiornano dal punteggio. Il salvataggio continua a usare le azioni autenticate
esistenti e le colonne attuali, senza migrazioni. I menu di edizione della
preview precedente rimangono disponibili nell’elenco amministrativo.

I contenuti non modificati conservano esattamente la stringa originale. Gli
aggiornamenti di un blocco preservano l’enfasi degli altri blocchi e le
interruzioni tra paragrafi. Il testo incollato viene inserito come testo; il
markup generato dall’editor ammette solo i tag di formattazione previsti,
senza attributi eseguibili. Gli errori di salvataggio mantengono aperto il
modulo e conservano sia i campi semplici sia le capacità già compilate.

## Verifica

- `npm test`: suite completa superata, inclusi i nuovi test del serializzatore
  e delle interazioni reali React DOM tramite JSDOM.
- `npm run build`: superata, compresi i controlli TypeScript.
- Test sulle 340 creature: tutti i cinque campi testuali supportati compiono
  un ciclo lettura/risalvataggio senza alterazioni quando non modificati.
- Test DOM: punteggi e modificatori, nuovo blocco, anteprima con collegamenti
  e senza mutazioni, ritorno al modulo, FormData inviata, errore di salvataggio
  senza reset, paragrafi, rimozione dell’enfasi, riordino, eliminazione,
  incolla come testo e conservazione dei campi originali del lich.
- Revisione indipendente: corretti reset dopo errore e perdita dei paragrafi;
  seconda revisione senza rilievi importanti residui.

## Limiti verificati

JSDOM verifica eventi e stato del modulo, non l’impaginazione reale.
Il browser Playwright non è disponibile nell’ambiente (download non riuscito):
restano da verificare visivamente iPhone e desktop. Nessun salvataggio è stato
eseguito attraverso la sessione amministrativa remota o sul database reale.
La modifica riguarda il modulo mostri; gli incantesimi mantengono il proprio
editor. Il salvataggio amministrativo pubblica direttamente nel catalogo,
come prima: non è stata aggiunta una modalità bozza.

Rilascio solo in preview. Nessuna promozione in produzione.
