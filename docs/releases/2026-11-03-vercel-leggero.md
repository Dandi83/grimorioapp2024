# Vercel più leggero (PROMPT 55, 3 novembre 2026)

Piano Hobby oltre i limiti: archiviazione deployment 18 GB su 10, scritture ISR 257.000 su 200.000. Solo modifiche nel repository, nessuna impostazione Vercel toccata.

## Anteprime dei branch
- `vercel.json`: `"git": { "deploymentEnabled": { "**": false, "main": true } }`. Documentazione Vercel: chiavi in sintassi minimatch, «quando un branch corrisponde a più regole e almeno una è true, il deployment avviene». `**` copre anche i branch con «/» (`feat/...`, `perf/...`), che `*` non coprirebbe.
- Risultato: Vercel pubblica in automatico solo `main` (produzione). I controlli GitHub (test, build e prove nel browser) restano invariati. Nei report: «anteprima: non creata (solo CI)».

## Scritture ISR: cause (prima)
1. 1.952 pagine pubbliche su 1.960 avevano `revalidate = 300` (a ogni visita dopo 5 minuti dall'ultima generazione la pagina veniva rigenerata e riscritta). Elenco: home, /grimorio, /bestiario e sottopagine, /classi, /compendio/condizioni, /preferiti, tutte le schede incantesimo, mostro, manuale, oggetti magici, armi, armature, avventura, strumenti, /ricerca-indice.json.
2. Le pagine senza `revalidate` (talenti, padronanze, proprietà, regole…) avevano lo stesso effetto: le cache dati `unstable_cache` della visibilità delle sezioni e delle correzioni admin avevano `revalidate: 300`, e Next abbassa il tempo della pagina al valore più basso delle cache che legge. Le liste incantesimi/mostri avevano 3600.
3. Ogni rigenerazione scrive HTML + RSC + 3 segmenti: in media circa 124 KB per pagina (243 MB per 1.951 pagine nella build), cioè circa 18 unità da 8 KB.
4. Dopo azioni admin: salvare un incantesimo invalidava tutte le schede incantesimo e mostro (circa 1.900 pagine) anche per un refuso; salvare o pubblicare una homebrew invalidava tutto il sito (`revalidatePath("/", "layout")`).
5. Nessuna rigenerazione da statistiche, voti, preferiti o parametri dell'indirizzo (verificato: le API pubbliche sono dinamiche e non invalidano nulla; i parametri non creano varianti delle pagine statiche).

## Cosa cambia (dopo)
- Pagine pubbliche statiche senza timer; cache dati senza timer (`revalidate: false`), invalidate solo dai salvataggi admin (tag `section-visibility`, `content-overrides`, `spells`, `monsters` e percorsi). robots e sitemap restano a una volta al giorno.
- `/ricerca-indice.json` dichiarato `force-static` (senza timer un route handler sarebbe diventato dinamico).
- Database non leggibile durante una rigenerazione: la pagina con i valori di riserva vive al massimo 60 secondi (`lib/isr-fallback.ts`), poi si rigenera; prima viveva 5 minuti.
- Incantesimo: se cambia solo il testo (descrizione, gittata, componenti…) si rigenera solo la sua scheda; nome, livello, tempo di lancio, durata, edizione, sintesi o fonte SRD continuano ad aggiornare liste, ricerca e collegamenti in tutte le schede.
- Homebrew: liste del Bestiario, home, ricerca, sitemap e la sua scheda; non più tutto il sito.
- Invariati (rari, e devono toccare tutto): visibilità sezioni/parti/schede, «Modalità solo SRD», importazione mostri, cambio di edizione di un incantesimo.

## Peso del deployment
- Prima: `.next/server` 366 MB (di cui 43 MB di source map del server, 791 file), pagine prerenderizzate 243 MB, `.next/static` 3 MB, `public` 1,3 MB. `.next/cache` (117 MB) non va nel deployment.
- Dopo: `experimental.turbopackSourceMaps: false`: niente source map, `.next/server` 336 MB. Il sito è identico; solo gli errori nei log del server indicano i file compilati invece dei sorgenti.
- Le pagine prerenderizzate (circa 1.960 × HTML, RSC e segmenti) sono la parte grande e servono al sito: non toccate.

## Prove
`tests/vercel-leggero.cjs` (nuovo, in `npm test`), `tests/spell-update.cjs` (salvataggio solo testo → solo la scheda; durata → aggiornamento completo), `tests/catalog-list-payload.cjs` aggiornato. e2e completa sul database di prova: 260 passate, 7 saltate, 0 fallite.
