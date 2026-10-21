# Condizioni nel Compendio (21 ottobre 2026)

- **`/compendio`**: nuovo riquadro «Condizioni» («Accecato, Avvelenato, Spaventato…») dopo gli Oggetti magici, identico agli altri riquadri (senza etichetta «NUOVO», su indicazione di Daniele).
- **`/compendio/condizioni`**: titolo, selettore 2024 · 2014 come nelle altre sezioni (la stessa scelta ricordata di Equipaggiamento e Oggetti magici), elenco in una sola carta con righe ≥ 44 px, nome in bordeaux e freccia. Ogni riga apre la pagina già esistente `/manuale/condizioni-…`: nessun testo duplicato.
  - **2024**: le 15 condizioni dei dati SRD 5.2.1 (`lib/data/srd-conditions-5.2.1-it.json`), con i nomi come stampati. Il manuale stampa «Indebolimento», non «Esausto».
  - **2014**: le 11 condizioni già presenti dall'SRD 5.1 (`srd-conditions-5.1-it.json`). Prono, Spaventato, Stordito e Trattenuto non sono stampate nell'SRD 5.1 italiano e non sono state inventate: sotto l'elenco 2014 una nota le nomina con i link alle loro pagine 2024 («Nell'SRD 5.1 italiano non sono stampate: … Le trovi nell'edizione 2024.»), ricavata dai dati.
- **Barra in basso**: «Compendio» resta evidenziato.
- **Offline**: il service worker salva `/compendio/condizioni`; le pagine delle condizioni erano già pubbliche offline.
- **Test**: `tests/conditions-list.cjs` e le prove nel browser (elenco, link senza 404, selettore, 360/375/390 px, offline).
