# Nota sulle sottoclassi non SRD (PROMPT 51, 2 novembre 2026)

Branch `feat/nota-sottoclassi-20261102`, da `main` dopo il PROMPT 50 (`7014000`).

- Nelle schede delle 12 classi, 2024 e 2014, una sola nota per edizione nella card del livello in cui la classe ottiene la sottoclasse, subito dopo il riquadro «Privilegio della sottoclasse · <sottoclasse SRD>» (scheda «Privilegi»).
- Livelli: 2024 → 3° per tutte; 2014 → 1° chierico, stregone, warlock; 2° druido e mago; 3° le altre. In tutte le 24 schede il primo privilegio della sottoclasse coincide con il livello stampato (`livelloSottoclasse`): nessuna classe con struttura diversa.
- Testi (Daniele, 2/11): titolo «ℹ️ Perché c'è una sola sottoclasse?»; 2024 «Il Grimorio pubblica solo le regole dell'SRD 5.2.1, la parte che Wizards of the Coast rilascia con licenza CC BY 4.0. Per <articolo classe> contiene una sola sottoclasse: le altre 3 si trovano nel Manuale del Giocatore 2024.»; 2014 «… dell'SRD 5.1 … le altre si trovano nel Manuale del Giocatore 2014.»; poi il link «Fonti e licenza» → /fonti. Articoli in `subclassNoteText` (`lib/classes.ts`).
- Grafica: fondo #FBF1D6, bordo tratteggiato ambra #E0A21A, angoli come le card, testo #2B2118; `role="note"`, titolo in grassetto (non un titolo H2/H3).
- Non compare (dal PROMPT 52 il tab Sottoclasse non conta più, vedi sotto): quando sono visibili al pubblico sottoclassi aggiunte dall'admin (la frase «una sola sottoclasse» non sarebbe vera), nell'indice di ricerca, nella sitemap e nella description. Nessun nome di sottoclassi non SRD.
- Disegnata sul server: nessun codice nel bundle del browser.
- Prove: `tests/subclass-note.cjs`, `e2e/nota-sottoclassi.spec.mjs`, controllo in `e2e/sezioni.spec.mjs` (parte nascosta).

## PROMPT 52 (2 novembre 2026)

La nota segue il riquadro «Privilegio della sottoclasse» della scheda «Privilegi», non la parte «Tab Sottoclasse»: con il tab nascosto o «In arrivo» la nota resta (in produzione il tab è nascosto per scelta di Daniele). Restano le altre regole: niente nota se la classe o l'edizione non è pubblica (la pagina non c'è), se il livello non ha il riquadro, o se sono pubbliche sottoclassi aggiunte dall'admin per quella classe ed edizione.
