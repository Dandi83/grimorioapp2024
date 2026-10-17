# Compilazione e scheda finale

## Obiettivo
La compilazione resta un modulo. Un pulsante esplicito Genera scheda costruisce il risultato finale con il linguaggio visivo del bestiario. La modifica si riapre dal pulsante Modifica scheda, conservando i dati; Genera scheda produce poi il risultato aggiornato. Ambito: prima pagina del PDF, solo preview.

## Implementazione
- CTA Genera scheda prima e dopo la compilazione; risultato separato dai controlli del modulo.
- Generazione deterministica di una copia indipendente dei dati, senza AI o costi di generazione.
- Grafica allineata ai dettagli dei mostri: stessa immagine hero, badge, nome, sottotitolo, riquadri statistiche, griglia 3x2 delle caratteristiche e titoli dorati.
- Dati della prima pagina: identità/progressione, PF/CA/iniziativa/competenza, sei caratteristiche e TS, 18 abilità, difese, sensi/movimento, dadi vita/morte, sei attacchi, munizioni e otto capacità. Le righe facoltative vuote vengono omesse; ogni testo valorizzato è verificato nel risultato. Vengono inclusi anche descrizione, condizioni, talenti e risorse della gestione rapida.
- Nessun input nella scheda finale; Modifica scheda torna al modulo con i dati intatti. Ripristinare lo storico riapre la compilazione per evitare una scheda generata obsoleta.
- Export JSON e storico esistenti conservati. Limiti invariati: memoria della sessione, nessun account/salvataggio cloud attivo, nessuna pubblicazione in produzione.

## Controlli
Test dedicato sul rendering effettivo: indipendenza della copia, grafica hero condivisa, nessun modulo nel risultato, tutti i testi della prima pagina popolati e presenti nel risultato, contenuti personali HTML resi come testo sicuro.

## Preview verificata
https://grimorioapp2024-jvu6q3kd9-grimorio-app.vercel.app/personaggi
Commit a7b9a2bfefcae4b9e2998d052ebe9c62459b7022, target preview, stato READY. Suite completa, TypeScript e build superati. Nel browser: PF modificati da 16 a 11, click diretto su Genera scheda senza blur manuale, risultato 11/20; Modifica scheda ripristina la compilazione con 11, modifica a 14 e rigenerazione producono 14/20. Risultato finale senza campi di input, con grafica bestiario, tutte le caratteristiche, bonus, attacchi e risorse dimostrative. Screenshot: personaggi-scheda-finale.jpg. Nessuna prova su iPhone fisico dichiarata. Produzione invariata.
