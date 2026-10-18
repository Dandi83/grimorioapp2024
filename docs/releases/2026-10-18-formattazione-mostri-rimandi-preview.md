# Preview: formattazione mostri e rimandi ipertestuali

Richiesta: usare il lich come riferimento per correggere la formattazione; spostare Condizioni citate e Incantesimi citati al fondo della pagina; sottolineare e collegare i nomi degli incantesimi nel testo.

Il rendering dei mostri separa i paragrafi con spaziatura compatta, ricompone i titoli spezzati dal PDF all'interno delle parentesi e distingue i gruppi di incantesimi per frequenza d'uso. Il lich mostra tre gruppi separati: 1/giorno ciascuno, 2/giorno ciascuno e A volontà.

I rimandi riepilogativi restano disponibili dopo contenuti e fonte. I nomi degli incantesimi esplicitamente identificati dal corsivo originale diventano collegamenti sottolineati; le parole ordinarie non diventano link a incantesimi. Sono gestiti anche nomi con accenti finali e sovrapposizioni tra nomi lunghi e brevi. Restano attivi link alle condizioni e icone dei danni.

Verifiche: suite npm test e build webpack/TypeScript superate. Conservazione del testo in 659 campi delle creature; controlli già presenti su 1.279 campi per condizioni e danni. Revisione indipendente: tutti i 399 rimandi attesi agli incantesimi sono collegati, senza variazioni del testo sorgente.

Solo preview. Nessuna modifica ai dati nel database o alla produzione. La verifica visiva online viene completata prima della consegna.
