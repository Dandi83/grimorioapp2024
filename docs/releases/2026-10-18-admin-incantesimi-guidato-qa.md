# Inserimento guidato degli incantesimi — preview

Creazione e modifica degli incantesimi usano lo stesso approccio del modulo
mostri: sezioni riconoscibili, controlli guidati, descrizione visuale e
anteprima prima del salvataggio.

- Livello (trucchetto o 1–9), scuola e classi si scelgono separatamente.
  Il modulo compone il campo `livello` nel formato già letto dall’app.
  È disponibile una modalità con testo completo personalizzato.
- Tempo di lancio, gittata e durata hanno tendine con valori comuni e
  un’opzione personalizzata per inneschi delle reazioni, aree e altre regole.
- Le componenti usano caselle V/S/M e un campo per materiali, costo e consumo.
  Il testo completo personalizzato resta disponibile.
- La descrizione usa l’editor visuale condiviso con i mostri; conserva il
  valore originale finché il testo non viene modificato.
- L’anteprima usa `HtmlText`, i richiami arrotondati e le icone esistenti.
  Le schede 2014 non aggiungono riferimenti automatici alle condizioni 2024.
- Gli errori di salvataggio conservano i campi, senza reset del modulo.

Le tendine e l’editor visuale sono componenti condivisi dai due moduli.
Nessuna modifica alle azioni server autenticate, alle colonne o al database.
L’etichetta dell’edizione continua a essere selezionabile nell’elenco admin.

## Verifica

- `npm test`: suite completa superata, inclusi i test DOM di entrambi i moduli.
- `npm run build`: superata, con controllo TypeScript.
- Test di selezione per livello, scuola, classi multiple senza duplicati,
  tempi, gittata, durata e componenti con costo/consumo dei materiali.
- Anteprima senza chiamate di mutazione; FormData con ciascun campo una sola
  volta; conservazione dei dati dopo un errore di salvataggio.
- Test su tutti i 340 record SRD degli incantesimi: nome, classificazione,
  tempo, gittata, componenti, durata e descrizione restano esatti senza edit.
- Test su classificazione, componenti e durate non standard.
- Regressione su Muro prismatico: le tabelle restano renderizzate e un
  tentativo di formattarne il testo non inserisce tag visibili nella scheda.
- Revisione indipendente: corretto il problema della formattazione dentro
  le tabelle; seconda revisione senza rilievi importanti.

## Limiti

Le tabelle preesistenti sono protette nell’editor visuale: il testo esterno
resta modificabile, il contenuto delle tabelle non si modifica in questo
campo. La protezione è indicata nel modulo.

I test DOM non sostituiscono una verifica visiva su iPhone, ancora da
completare. Nessun salvataggio eseguito sul database reale. Il pulsante
«Crea nel catalogo» conserva il comportamento di salvataggio diretto;
«Anteprima» non salva. Rilascio solo in preview, senza promozione in produzione.
