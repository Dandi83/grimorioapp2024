# Nuovo aspetto — PR A: base e Bestiario — 20 ottobre 2026

Branch `feat/look-base-20261020` da `main` (`002c2ea`). Solo aspetto e disposizione: nessun dato, testo trascritto, indirizzo di pagina, preferito, copia offline o area riservata cambiati; nessuna scrittura nel database.

- Tema chiaro unico (pergamena #F6EFDF, testo #2B2118, secondario #5E4E3E, bordeaux #7A1F2B, ambra #E0A21A, linee #CDBB96/#DDCFAE, superfici #E9DDC2/#FFFBF0, barra #EADFC6). Contrasto del testo ≥ 4.5:1 su ogni superficie; l'ambra è solo uno sfondo con testo scuro (7:1).
- Caratteri con `next/font`, `display: swap`: EB Garamond (normale e corsivo) e Source Sans 3 al posto di Inter. Sono font variabili: un file per stile copre tutti i pesi usati.
- Navigazione in basso: 4 voci con icone a tratto, voce attiva in bordeaux, aree sicure dell'iPhone rispettate.
- Bestiario a lista unica (mostri e animali insieme): titolo, selettore 2024/2014, riga bordeaux, ricerca, pulsante Filtri con numero in ambra, etichette dei filtri attivi con ×, tabella Nome · GS · Tipo, righe ≥ 62 px.
- Pannello Filtri dal basso: Categoria, Grado sfida a fasce (0–1, 2–4, 5–10, 11–16, 17+), Tipo, Taglia, Habitat; «Azzera»; «Mostra N risultati». «O» dentro lo stesso filtro, «e» tra filtri diversi.
- Indirizzi con filtri: i vecchi `?raccolta=animali`, `?gs=1/2`, `?tipo=Drago` funzionano ancora; un GS esatto apre la sua fascia.
- Home, Preferiti, Fonti, Account, Personaggi: solo colori e caratteri.
- AGENTS.md e `docs/continuita-progetto.md` aggiornati.
