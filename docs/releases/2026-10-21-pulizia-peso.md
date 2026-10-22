# Pulizia e peso (PR B) — 21 ottobre 2026

Ramo `perf/pulizia-peso-20261021`, costruito sopra la PR A (sicurezza, #56) e la PR 3 (segnalazioni, #55).

## Misure (stessa macchina, build di produzione locale, iPhone 390 px, gzip, dopo 2,5 s di inattività)

| Misura | Prima | Dopo |
|---|---|---|
| Tempo di build (`next build`, senza cache) | 41,7 s | 39,7 s |
| Cartella `public/` | 4,6 MB | 1,5 MB |
| File del progetto (senza .git, node_modules, .next) | 15 MB | 12 MB |
| Repository `.git` | 74 MB (59 MB di pacchetti) | invariato (la cronologia conserva i file vecchi) |
| Home: JS / immagini / totale | 179,4 / 79,8 / 531,3 KB | 179,4 / 79,8 / 531,3 KB |
| Scheda incantesimo: JS / immagini / totale | 184,1 / 70,9 / 528,8 KB | 184,1 / 66,3 / 524,2 KB |
| Scheda mostro: JS / totale | 178,9 / 476,7 KB | invariato |
| Scheda arma: JS / totale | 178,2 / 451,7 KB | invariato |
| Scheda oggetto magico: JS / totale | 178,2 / 450,5 KB | invariato |

## Immagini
| File | Prima | Dopo | Differenza media per pixel (0–255) |
|---|---|---|---|
| hero-libro.png → .webp (testata incantesimi, via next/image) | 1.416 KB | 114 KB | 1,4 |
| hero-bestiario.png → .webp (personaggi, servita intera) | 1.290 KB | 84 KB | 1,7 |
| character-sheet/page-1…4.jpg → .webp (foglio personaggio, servite intere) | 341+270+301+308 KB | 156+119+142+149 KB | 0,6–0,9 |
| icon-512.png (icona installabile) | 330 KB | **non cambiata** | — |

- icon-512 resta PNG: la compressione senza perdita non riduce nulla; la versione a 256 colori (145 KB) cambia leggermente le sfumature. Per «qualità identica» è rimasta com'è.
- hero-libro-og.jpg resta JPG: è l'anteprima dei link condivisi (WhatsApp e simili vogliono JPG/PNG).
- Tutti i file in `public/` sono referenziati (hero-atmosfera, hero-libro, hero-libro-og, hero-bestiario, icon-512, icon-install, damage-icons, character-sheet).
- Personaggi e foglio personaggio sono visibili solo nelle anteprime: in produzione il guadagno riguarda la testata degli incantesimi e il peso del progetto.

## Codice rimosso (commit separati)
1. 9 esportazioni mai usate da nessun file, test o script: `gear2014Intro`, `packs2014Intro`, `gearSource`, `gearIntro`, `openAnalyticsPreferences`, `EQUIPMENT_EDITIONS`, `weaponPrintedTwice2024`, `findMagicItem`, `toolsSource2024`.
2. `components/spell-references.tsx`: componente che nessuna pagina importa (i riferimenti agli incantesimi sono già in linea nel testo). Le funzioni di `lib/spell-references.ts` restano: sono usate e testate.
3. `prettier`: libreria di sviluppo mai eseguita da nessuno script.
4. Una direttiva eslint inutile in `lib/admin-action-helpers.ts`.

Controlli fatti: knip (file, esportazioni, dipendenze), ricerca nel codice, test e script; CSS di `globals.css`, `dashboard.css` e moduli: nessuna classe inutilizzata.

## Lasciati apposta
- 28 esportazioni usate solo dentro il proprio file (togliere `export` non cambia il peso).
- `lib/data/**` e gli script di controllo dei manuali: non toccati.
- Script probabilmente obsoleti, **elencati e non rimossi**: `scripts/seed.mjs`, `scripts/fill-magic-missile.mjs`, `scripts/export-srd.mjs`, `scripts/migrations/add-20-srd.mjs` (fixture e migrazioni storiche: AGENTS.md vieta di eseguirle sui dati reali). Gli strumenti Python `check-*.py` e `transcribe-*.py` servono a rifare le trascrizioni e restano.

## Bundle: i 5 moduli più pesanti nel browser (gzip, Home)
1. React DOM e runtime React — circa 72 KB.
2. Runtime client di Next.js (router App, hydration) — circa 46 KB.
3. Codice dell'elenco Incantesimi — circa 13 KB: è il precaricamento di Next per i link della barra in basso, a bassa priorità e dopo il primo disegno.
4. Guscio comune (barra in basso, statistiche e consenso, preferiti, avviso offline, icone lucide) — circa 10 KB.
5. Pannello di ricerca — circa 7 KB: già caricato in differita, nei momenti di inattività o al primo tocco.
- Non rimandati: il banner «Aggiungi alla schermata Home» (circa 1,5 KB) deve ascoltare subito l'evento di installazione di Android; i calcolatori (Avanzamento) sono già solo nella loro pagina.

## Verifiche
`npm test`, tipi, lint, build con controllo «niente testo completo nel bundle», 27 prove nel browser comprese quelle offline (pagine salvate, ricerca, segnalazioni).
