# Nota «Perché non ci sono tutti i talenti?» (PROMPT 54, 3 novembre 2026)

- In cima a `/talenti`, sotto il titolo e sopra ricerca, filtri ed elenco, una nota con lo stesso riquadro della nota delle sottoclassi (componente condiviso `components/info-note.tsx`, `role="note"`, link «Fonti e licenza» a /fonti).
- Testo per edizione da `featsNoteText` in `lib/feats.ts`; il numero viene dai dati (17 talenti SRD 5.2.1; nel 2014 «un solo talento, Lottatore», altrimenti «N talenti»).
- Non compare nelle schede `/talenti/<id>`. Segue la visibilità della sezione Talenti: con «In arrivo» o «Nascosta» la pagina risponde «in costruzione» e la nota non c'è. Lo stato della sezione non è stato cambiato (resta «In arrivo»).
- Ricerca generale: con la sezione visibile i talenti si trovano anche per nome inglese (Alert, Grappler, Boon of Fate); con «In arrivo» no. Nessuna modifica alla ricerca.
- Prove: `tests/feats.cjs`, `tests/subclass-note.cjs`, `e2e/nota-talenti.spec.mjs` (sul database di prova, stato rimesso «In arrivo» alla fine).
