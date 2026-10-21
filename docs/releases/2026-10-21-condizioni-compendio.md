# Condizioni nel Compendio (21 ottobre 2026)

- **`/compendio`**: nuovo riquadro «Condizioni» («Accecato, Avvelenato, Spaventato…») dopo gli Oggetti magici, con bordo ambra 2 px e l'etichetta «NUOVO». È l'unico riquadro con l'etichetta (campo `nuovo` di `SectionTile`).
- **`/compendio/condizioni`**: titolo, selettore 2014/2024 (la stessa scelta ricordata di Equipaggiamento e Oggetti magici), elenco in una sola carta con righe ≥ 44 px, nome in bordeaux e freccia. Ogni riga apre la pagina già esistente `/manuale/condizioni-…`: nessun testo duplicato.
  - **2024**: le 15 condizioni dei dati SRD 5.2.1 (`lib/data/srd-conditions-5.2.1-it.json`), con i nomi come stampati. Il manuale stampa «Indebolimento», non «Esausto».
  - **2014**: le 11 condizioni già presenti dall'SRD 5.1 (`srd-conditions-5.1-it.json`). Prono, Spaventato, Stordito e Trattenuto non sono stampate nell'SRD 5.1 italiano e non sono state inventate.
- **Barra in basso**: «Compendio» resta evidenziato.
- **Offline**: il service worker salva `/compendio/condizioni`; le pagine delle condizioni erano già pubbliche offline.
- **Test**: `tests/conditions-list.cjs` e le prove nel browser (elenco, link senza 404, selettore, 360/375/390 px, offline).
