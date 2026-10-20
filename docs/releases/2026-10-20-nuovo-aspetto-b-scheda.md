# Nuovo aspetto — PR B: scheda mostro (2024 e 2014) — 20 ottobre 2026

Branch `feat/look-scheda-20261020`, sopra la PR A. Modello: la scheda del Lich 2024. Solo ordine e disposizione; nessun testo trascritto o dato cambiato, nessuna scrittura nel database.

## Differenze di disposizione Lich 2024 / Lich 2014 (prima)

1. Riquadri in alto: 2024 sei (CA, PF, Velocità, Grado sfida, Iniziativa, Bonus di competenza); 2014 cinque (manca il bonus di competenza).
2. Sotto l'etichetta edizione, solo nel 2014, una nota «Questa scheda utilizza le regole 2014…».
3. Incantesimi: 2024 tra le Azioni, dopo le altre azioni; 2014 tra i Tratti, come primo tratto.
4. Liste di incantesimi: 2024 nomi come bollini collegati; 2014 nomi in corsivo, senza collegamento.

Le altre differenze erano di contenuto (numeri, tiri salvezza solo competenti, immunità su due righe, niente equipaggiamento, nessuna reazione nel Lich 2014).

## Dopo (uguale per 2024, 2014, schede create nell'area riservata e anteprima dell'editor)

- Un solo componente (`components/monster-sheet.tsx`) per scheda pubblica e anteprima dell'editor.
- Intestazione: «‹ Bestiario», condividi e stella; titolo serif 42 px con etichetta scura «2024»/«2014» (icona libro, fonte nel testo accessibile); riga bordeaux 4 px; tipo, taglia e allineamento in corsivo.
- Tre riquadri: CA (tipo di armatura sotto), PF (dadi vita sotto), Iniziativa (2014: dalla Destrezza; 2024: ufficiale, valore passivo tra parentesi sotto). Poi la riga Velocità. Il grado sfida non è più un riquadro.
- Caratteristiche: sei riquadri; poi Tiri salvezza, Abilità, Vulnerabilità/Resistenze/Immunità, Equipaggiamento, Sensi, Linguaggi, **Grado sfida** in bordeaux con PE e bonus di competenza tra parentesi (2014: bonus calcolato dal GS), poi Habitat se presente.
- Sezioni Tratti, Azioni, Azioni bonus, Reazioni, Azioni leggendarie (solo se presenti): maiuscoletto bordeaux con linea sottile. Testo in Source Sans, nomi in EB Garamond grassetto, formule di gioco in corsivo.
- 2014: il blocco «Incantesimi…» è mostrato tra le Azioni, dopo le altre azioni (stesso testo).
- Liste di incantesimi: blocchi con etichetta in grassetto e linea verticale bordeaux di 3 px.
- Bollini: tutti i link dentro i testi, su ogni pagina, con lo stesso stile (#F1DDD5, bordo #D9B7AC, testo bordeaux grassetto, angoli 6 px). Sulle schede 2014 solo le definizioni 2014; Prono, Spaventato, Stordito e Trattenuto restano testo semplice.

## Verifiche

`npm test` (nuovi controlli: anteprima e scheda pubblica identiche; sulle 322 schede 2014 iniziativa calcolata, grado sfida con bonus calcolato, incantesimi tra le azioni), lint, `tsc`, `npm run test:e2e`.
