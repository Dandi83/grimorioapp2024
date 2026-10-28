# Ricerca tollerante agli errori e controllo della velocità — 28 ottobre 2026

Base: `main` a `5a6be85` (#119). Branch: `web/ricerca-tollerante-velocita-20261028`. Nessun file condiviso con il filone iPhone.

## Ricerca tollerante

Una funzione nostra, `lib/fuzzy-search.ts`, senza librerie (0 KB di dipendenze aggiunte), usata da tutte le ricerche
del sito sui dati già scaricati, senza nuove chiamate al server:

- Home (pannello «Cerca nel Grimorio», tutte le sezioni, 2024 e 2014);
- liste: incantesimi, bestiario, equipaggiamento d’avventura, strumenti, oggetti magici, manuale.

Regole:

- accenti, maiuscole, apostrofi, trattini e barre ignorati («Dell’Aria» = «dell aria», «Mezzo-Orco» = «mezzo orco»);
- errori di battitura (distanza Damerau-Levenshtein: due lettere scambiate valgono un errore), per parola: nessuno sotto le 4 lettere, 1 da 4 a 7, 2 da 8 in su;
- ogni parola cercata corrisponde, nell’ordine, a una parola diversa del nome; l’ultima può essere ancora a metà («palla di fuo»);
- ordine: nome esatto, poi «inizia con», poi «contiene», poi gli approssimati (meno errori prima), sempre dopo tutti gli esatti;
- liste a gruppi (incantesimi per livello, creature per GS, strumenti per tipo): gli esatti restano nei loro gruppi; gli approssimati vanno in fondo sotto «Risultati simili» (anche negli oggetti magici: «spada» mostra prima le spade, poi «Spadone…» tra i simili);
- se nessun nome corrisponde esattamente ma ci sono approssimati: «Forse cercavi: <nome>», un tocco lo mette nel campo;
- la Home continua a cercare solo a inizio parola, le liste in qualunque punto del nome, come prima;
- manuale: il testo delle voci è cercato come prima; gli errori sono tollerati solo nei titoli, e solo se il testo non trova nulla;
- statistiche delle ricerche: contano solo i risultati esatti, così «Cercano senza trovare» resta significativo.

Tempo per tasto («palla di foco» scritto lettera per lettera; indice completo della Home: 1.311 nomi delle due
edizioni). Prova `e2e/ricerca-tollerante.spec.mjs`, Chromium con CPU rallentata 4× (stima di un telefono):

| Misura | Mediana | Caso peggiore |
|---|---|---|
| Solo la ricerca, indice completo, nomi già preparati | 2,5 ms | 9,2 ms |
| Solo la ricerca, primo tasto con nomi non ancora preparati | 30 ms (una volta) | — |
| Dal tasto al disegno, Home — `main` prima del lavoro | 33,1 ms | 174 ms |
| Dal tasto al disegno, Home — con la ricerca tollerante | 36,5 ms | 223 ms |
| Dal tasto al disegno, lista incantesimi — `main` | 14,5 ms | 82 ms |
| Dal tasto al disegno, lista incantesimi — con la ricerca tollerante | 18,4 ms | 33 ms |

La ricerca da sola resta sotto i 16 ms (la prova lo controlla). «Dal tasto al disegno» comprende anche l’attesa del
fotogramma successivo e il disegno dei risultati: era già così su `main`, le differenze sono dentro la variabilità
delle esecuzioni. La prima versione costava 9 ms per tasto in Node (circa 36 ms con CPU 4×) solo per la ricerca; due
correzioni: distanza calcolata una volta per parola con memoria riutilizzata, e un filtro per lettere che scarta senza
calcoli le parole impossibili. I nomi vengono preparati quando il browser è libero, non al primo tasto. Non è stato
misurato su un iPhone reale.

Regola tra le edizioni nella Home: se l’altra edizione ha il nome esatto, vince quello. «cesto» nel 2014 non mostra
«Custodia per mappe…» come simile ma, come prima, «Nessun risultato per «cesto» nel 2014» e «Cerca anche nel 2024».

## Controllo della velocità

Lighthouse 12.8.2 mobile (Moto G emulato, 4G lenta, CPU 4×), 3 esecuzioni per pagina, mediana; build di produzione
locale (`next start`, database di prova). «JS iniziale»: script scaricati fino all’evento load (stabile tra le
esecuzioni; dopo il load la barra in basso precarica le liste quando il browser è libero, e quella parte varia da
un’esecuzione all’altra).

| Pagina | Performance | LCP (s) | CLS | TBT (ms) | JS iniziale (KB gzip) |
|---|---|---|---|---|---|
| Home `/` | 93 → 94 | 3,3 → 2,8 | 0 → 0 | 107 → 119 | 177 → 177 |
| Lista incantesimi `/grimorio` | 92 → 92 | 2,8 → 2,8 | 0 → 0 | 217 → 194 | 212 → 214 |
| Scheda incantesimo `/spell/palla-di-fuoco` | 88 → 93 | 3,5 → 3,1 | 0 → 0 | 178 → 90 | 178 → 178 |
| Lista bestiario `/bestiario` | 87 → 86 | 3,8 → 3,9 | 0 → 0 | 197 → 175 | 212 → 214 |
| Scheda mostro `/mostro/aboleth` | 93 → 92 | 3,1 → 3,2 | 0 → 0 | 89 → 120 | 173 → 173 |
| Ricerca `/?cerca=palla%20di%20fuoco` | 92 → 93 | 2,7 → 3,2 | 0,059 → 0 | 114 → 115 | 177 → 177 |

Le differenze di Performance, LCP e TBT tra prima e dopo sono dentro la variabilità delle esecuzioni (sulla stessa
build lo stesso numero oscilla di 5–10 punti). Le uniche variazioni reali: CLS della ricerca a 0 e +2 KB di JS sulle
liste (la ricerca tollerante).

JSON (misurati sulla build locale; in produzione Vercel li serve già compressi con brotli, verificato il 28 ottobre):

| File | Grezzo | gzip | brotli | Chi lo scarica |
|---|---|---|---|---|
| `/ricerca-indice.json` | 125,6 KB | 21,2 KB | 18,3 KB | il pannello di ricerca, solo quando si apre |
| `/api/catalogo/incantesimi` | 128,4 KB | 16,1 KB | 12,4 KB | solo computer (≥1024 px), colonna della lista |
| `/api/catalogo/bestiario` | 107,3 KB | 9,7 KB | 7,8 KB | solo computer (≥1024 px), colonna della lista |

Esito dei controlli:

1. Indice e testi sono già separati: l’indice di ricerca contiene solo nomi e indirizzi, le liste solo i dati delle righe; i testi completi restano nelle schede. Nessuna modifica; service worker e offline invariati.
2. Bundle pubblico: editor, statistiche e area riservata non ci sono (cercate le loro scritte in tutti i file JS delle pagine pubbliche). Restano piccoli moduli da ~3 KB gzip che controllano se il visitatore è l’amministratore (pulsante «Modifica», segni NO SRD, filtro Provenienza, numero sull’icona): codice, nessun dato riservato; i dati arrivano solo dalle API admin dopo il controllo della sessione.
3. Immagini: `hero-atmosfera.webp` (Home) e `hero-libro.webp` (schede incantesimo) hanno `priority` perché sono l’elemento LCP; `sizes` adeguati al telefono; WebP come deciso il 18 ottobre (niente AVIF). Nessuno spostamento del layout dalle immagini.
4. Font: EB Garamond e Source Sans 3 variabili (un file per stile), solo latin, `display: swap`.
5. Terze parti: Vercel Analytics solo su Vercel, caricato dopo il contenuto; Turnstile solo su `/segnala` e `/bestiario/proponi`, caricato dopo la pagina.
6. Correzione fatta: nel pannello di ricerca la fila «Tutto · Incantesimi · …» compariva all’arrivo dell’indice e spingeva giù i risultati (CLS 0,059). Ora il suo posto è riservato da subito: CLS 0, nessun cambiamento visibile.

Proposte non fatte (cambiano qualcosa o servono prove sul telefono):

- non precaricare il corsivo di EB Garamond (47 KB, oggi precaricato su ogni pagina insieme al tondo e a Source Sans 3): si risparmia banda, ma dove il corsivo compare subito (la frase della Home) potrebbe vedersi un attimo il carattere di riserva;
- spostare i moduli di controllo admin (~3 KB gzip) dietro import dinamici: risparmio piccolo, rischio di un attimo di ritardo del pulsante «Modifica»;
- AVIF resta escluso finché non si prova la fluidità su iPhone.
