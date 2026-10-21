# Equipaggiamento: armi 2014 e 2024 (21 ottobre 2026)

Nuova sezione pubblica `/equipaggiamento` con la prima voce, **Armi**.

## Compendio (revisione del 21 ottobre)

- La barra in basso ha una quinta voce, **Compendio** (Home · Incantesimi · Bestiario · Compendio · Preferiti), attiva anche in tutte le pagine `/equipaggiamento/...`.
- Nuova pagina `/compendio` con un solo riquadro, «Equipaggiamento» (`components/section-tiles.tsx`, pronto per altri riquadri).
- La Home non ha più il riquadro Equipaggiamento; il link nel Manuale resta.
- In alto: `/equipaggiamento` → «‹ Compendio», elenco armi → «‹ Equipaggiamento», scheda arma → «Tutte le armi».
- Service worker: `/compendio` è tra le pagine salvabili e tra le sezioni principali salvate all'installazione.

## Indirizzi

- `/equipaggiamento` — riquadri delle voci (per ora solo Armi; Armature arriva con il passo successivo).
- `/equipaggiamento/armi` — elenco semplice in quattro gruppi; «Vedi come carte» (`?vista=carte`) con i filtri Semplici/Da guerra e Mischia/Distanza.
- `/equipaggiamento/armi/[id]` — scheda dell'arma con proprietà, padronanza (2024), regola speciale (2014) e tabella «2014 → 2024» solo se cambia qualcosa.

Il selettore 2024/2014 vale per tutta la sezione e viene ricordato sul telefono. Ogni pagina contiene entrambe le edizioni, così funziona anche dalla copia salvata offline.

## Dati e fonti

- `lib/data/srd-weapons-it.json`, generato da `scripts/transcribe-srd-equipment.py` dai PDF ufficiali (non nel repository; il programma controlla lo sha256):
  - SRD 5.1 italiano, pp. 71–73 (tabella Armi, Proprietà delle armi, Armi speciali);
  - SRD 5.2.1 italiano, pp. 103–104 (tabella Armi).
- 2014: 37 armi. 2024: 38 armi (Rete assente; Moschetto e Pistola nuove). Stesso id nelle due edizioni.
- I testi 2014 delle proprietà sono nel file dati con l'impronta sha256. I testi 2024 di proprietà e padronanza vengono dalla voce «Armi» del Manuale 2024, senza copie.
- Nel PDF 2024 le righe di Stocco e Tridente sono stampate due volte: compaiono una volta sola (`righeDoppieNelPdf2024`).
- La tabella del Manuale 2024 (voce «Armi») è sostituita da un riquadro che porta alla nuova sezione; i testi delle regole restano.

## Altre modifiche

- Service worker: l'elenco delle pagine pubbliche salvabili include `/equipaggiamento`, `/equipaggiamento/armi[/id]` e `/equipaggiamento/armature[/id]`. Nessun'altra modifica al funzionamento.
- `/fonti`: riga di attribuzione CC-BY per le armi.
- Guard del bundle: i testi 2014 delle proprietà sono tra i testi che non devono finire nel codice del browser.

## Verifiche

`tests/equipment.cjs` (conteggi, nessun doppione, confronto riga per riga con la tabella della richiesta, 8 armi che cambiano, testi presenti, offline), `scripts/check-manual.mjs` (tabella sostituita), e2e (riquadro Home, elenco e carte nelle due edizioni, filtri combinati, nessuno scorrimento orizzontale a 375 px, tutte le schede 200, scheda offline).
