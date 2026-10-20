# Nuovo aspetto — PR C: Incantesimi (2024 e 2014) — 20 ottobre 2026

Branch `feat/look-incantesimi-20261020`, sopra la PR B. Solo aspetto e disposizione; nessun testo o dato cambiato.

- Stessa testata del Bestiario: titolo, selettore 2024/2014 (ricordato sul telefono), riga bordeaux, ricerca e Filtri con lo stesso pannello: Livello, Scuola, Classe, Concentrazione, Rituale. «O» dentro lo stesso filtro, «e» tra filtri diversi; etichette dei filtri attivi con ×.
- Elenco raggruppato per livello: «Trucchetti», «Livello 1»… in serif bordeaux con linea e conteggio a destra.
- Riga: nome serif 21 px, sotto «Scuola · tempo di lancio», poi le etichette ambra «Concentrazione» e/o «Rituale» per intero, solo quando valgono.
- L'indice leggero dell'elenco porta in più il tempo di lancio e, solo quando valgono, concentrazione (durata che inizia con «Concentrazione»), rituale («rituale» nel tempo di lancio o nel livello) ed edizione 2014 (scelta nell'area riservata). Nessuna descrizione e nessuna durata nel codice del telefono.
- Indirizzi: `?livello=3&scuola=…&classe=…` funzionano ancora; più valori separati da virgola, `concentrazione=1`, `rituale=1`, `edizione=2014`.
- L'elenco 2014 mostra solo gli incantesimi segnati 2014 nell'area riservata; se non ce ne sono lo dice.

Verifiche: `npm test` (test dell'elenco e dell'indice aggiornati), lint, `tsc`, `npm run test:e2e`.
