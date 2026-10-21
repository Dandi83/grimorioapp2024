# Equipaggiamento: Strumenti 2014 e 2024 (21 ottobre 2026)

Quarto riquadro di `/equipaggiamento`: **Strumenti**, con il selettore 2014/2024 (stessa scelta ricordata delle altre voci).

## Indirizzi

- `/equipaggiamento/strumenti`: ricerca per nome; 2024 a gruppi «Strumenti da artigiano» e «Altri strumenti», 2014 a gruppi «Strumenti da artigiano», «Giochi», «Strumenti musicali», «Altri strumenti». Il testo «Competenza negli strumenti» (2024) e l'introduzione 2014 sono in un riquadro ripiegabile; i testi dei gruppi 2014 compaiono una volta, in testa al gruppo.
- `/equipaggiamento/strumenti/<nome>`: scheda 2024 (costo, peso, Caratteristica, Utilizzo con CD, Creazione, Varianti) e scheda 2014 (costo, peso, descrizione se esiste). Stesso nome nelle due edizioni = stessa pagina con il selettore.
- 2014: ogni gioco e strumento musicale ha la sua pagina (es. `/liuto`) con la nota «Nel 2024: Strumento musicale, variante «Liuto»», se la variante 2024 ha lo stesso nome; il selettore porta a `/strumento-musicale`, dove ogni variante rimanda alla sua voce 2014.

## Dati

- 2014: `lib/data/srd-tools-5.1-it.json` da `scripts/transcribe-srd-equipment.py … tools2014` (PDF SRD 5.1 pp. 78–79, colonna per colonna): 35 righe (19 da artigiano, 2 giochi, 10 strumenti musicali, 4 altri), introduzione e 9 descrizioni con impronta sha256. La riga «Veicoli (terrestri o acquatici)» non è inclusa.
- 2024: `lib/tools.ts` dalla voce `equipaggiamento-strumenti` del Manuale 2024: 17 strumenti da artigiano e 8 altri; schede spezzate dal cambio pagina ricongiunte, sillabazioni unite.
- Correzione di sola visualizzazione (`lib/data/tools-repairs-20261021.json`): «, -torcia» → «, torcia» (Strumenti da falegname).
- Abbinamento solo per nome; nessuna differenza di costo o peso fra le edizioni.

## Altro

Guard del bundle (testi 2014 e testi 2024 della voce), service worker (pagine `/equipaggiamento/strumenti…`), riga in `/fonti`.
