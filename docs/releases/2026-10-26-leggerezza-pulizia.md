# Leggerezza, pulizia e Druido — 26 ottobre 2026

## Misure prima (produzione db221c9, Lighthouse 13.5 mobile, mediana di 3 passaggi)

| Pagina | Perf | LCP s | CLS | TBT ms | JS KB | CSS KB | Img KB | Font KB | Richieste |
|---|---|---|---|---|---|---|---|---|---|
| / | 96 | 2.73 | 0 | 76 | 192 | 20 | 41 | 119 | 28 |
| /grimorio | 92 | 3.00 | 0 | 151 | 180 | 18 | 0 | 119 | 23 |
| /bestiario | 94 | 2.86 | 0 | 121 | 180 | 18 | 0 | 119 | 23 |
| /mostro/lich | 96 | 2.69 | 0 | 84 | 184 | 18 | 24 | 119 | 30 |
| /spell/palla-di-fuoco | 97 | 2.56 | 0 | 61 | 189 | 18 | 40 | 119 | 27 |
| /compendio | 95 | 2.63 | 0 | 157 | 190 | 18 | 0 | 119 | 38 |

## Interventi

- Riquadri di Compendio ed Equipaggiamento (`components/section-tiles.tsx`, `components/intent-link.tsx`): la pagina della sezione si prepara al primo tocco o al passaggio del mouse, come gli elenchi e la barra in basso, invece di scaricare tutte le sezioni appena il riquadro compare (sul Compendio: 14 richieste e circa 65 KB in meno all'apertura).
- Druido 2024: la tabella «Interdizione della Natura» (4 colonne, 307 px in 302) ora sta nel riquadro sul telefono: celle con margine interno più stretto solo per le tabelle interne da 4 colonne in su (`components/classes/class-blocks.tsx`).

## Valutati e lasciati

- Font: già variabili, solo sottoinsieme latino, 3 file (Source Sans 3, EB Garamond normale e corsivo); il corsivo serve nella Home («magie.») e nelle schede.
- JS: il blocco più grosso è React/Next (72 KB, con 14 KB di compatibilità aggiunti da Next che non si possono togliere da configurazione). Il precaricamento di Incantesimi e Bestiario a riposo resta (scelta delle prestazioni del 25 ottobre).
- Icone PNG: ricompresse senza perdita non si riducono; ridurle cambierebbe l'icona sulla Home dell'iPhone.
- Nessun componente client trasformabile in server: tutti usano stato, effetti o eventi.

## Pulizia

- `scripts/fill-magic-missile.mjs`: correzione una tantum già applicata in produzione il 17 ottobre (vedi `2026-10-17-dardo-incantato.md`), nessun riferimento nel codice, script che scrive sul database reale.
- 109 export non usati fuori dal loro file: tolta la parola `export` (restano usati nel file). Due tipi mai usati (`NewSpellRow`, `NewMonsterRow`) eliminati.
- Lasciati: `scripts/seed.mjs` (citato da AGENTS.md e README), `scripts/export-srd.mjs` (strumento di trascrizione), `scripts/migrations/add-20-srd.mjs` (richiesto da `scripts/check-srd-additions.mjs`), tutti i file in `public/` (usati, anche con indirizzi costruiti come `/damage-icons/${tipo}.png` e `/character-sheet/page-${n}.webp`), tutte le dipendenze (tutte usate).
