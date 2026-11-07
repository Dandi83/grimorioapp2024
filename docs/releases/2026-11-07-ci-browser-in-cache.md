# CI più stabile: browser delle prove in cache (PROMPT 73, 7 novembre 2026)

Solo la CI di GitHub: il codice dell'app, Vercel, le variabili e le impostazioni del repository non cambiano.

## Il problema
Il passo «Browser per le prove» dei job «Build e prove nel browser» cadeva oltre il limite di 10 minuti (PROMPT 62, 66, 72), prima che partissero le prove. Nel log della parte 2 del PROMPT 72 (job 128127779545, 6 novembre):
- `apt-get update`: 3 secondi;
- 185 pacchetti di sistema per Chromium, WebKit e Firefox, **139 MB in 9 min 33 s (242 kB/s)** dal mirror Ubuntu di Azure;
- i tre browser dal CDN di Playwright: pochi secondi.

Il collo di bottiglia erano i pacchetti `.deb`, non i browser.

## Cosa cambia in `.github/workflows/ci.yml`
Nei job «Build e prove nel browser (parte 1 di 2)» e «(parte 2 di 2)», al posto di `npx playwright install --with-deps chromium webkit firefox`:
1. «Versione di Playwright e sistema»: versione di `playwright-core` da `package-lock.json` (oggi 1.64.1) e sistema del runner (`ubuntu-26.04-X64`).
2. «Browser dalla cache»: `actions/cache/restore` di `~/.cache/ms-playwright`, chiave `pw-browser-<sistema>-<versione>`.
3. «Pacchetti di sistema dalla cache»: `actions/cache/restore` di `~/.cache/pw-apt-debs`, la voce più recente `pw-apt-<sistema>-<versione>-…`.
4. «Browser per le prove» (`scripts/ci-browser-deps.sh`, limite **20 minuti** invece di 10):
   - con la cache: installa solo i pacchetti non ancora presenti, dai file locali, **senza `apt-get update` e senza mirror** (apt vede solo i pacchetti installati e quei file, `--no-download`); poi `playwright install-deps --dry-run` deve dire «All system dependencies are installed»;
   - senza cache, o se i file non bastano: `apt-get update`, Playwright elenca i pacchetti mancanti (la stessa lista di `--with-deps`), apt scarica solo quelli nella cartella della cache con `Acquire::Retries=3`, **due tentativi da 7 minuti** (il secondo riprende dai file già scaricati), poi installazione dai file locali come sopra;
   - ultima possibilità: il comando di prima (`playwright install-deps`);
   - poi `playwright install chromium webkit firefox` (con la cache dei browser non scarica nulla; un nuovo tentativo se il CDN non risponde).
5. «Salva i browser in cache» solo se mancavano; «Salva i pacchetti di sistema in cache» solo se qualcosa è arrivato dal mirror (nuova voce con `run_id`, così la successiva prende la più recente).

Invariati: stessi browser (Chromium, WebKit, Firefox), stessa divisione in due parti, nessuna prova tolta o saltata, nomi dei 3 controlli obbligatori («Test, tipi e stile del codice», «Build e prove nel browser (parte 1 di 2)», «Build e prove nel browser (parte 2 di 2)»).

Pacchetti: la lista resta quella ufficiale di Playwright per i tre browser con `--no-install-recommends` (185 pacchetti su Ubuntu 26.04, quasi tutti per WebKit e GStreamer): toglierne alcuni rischierebbe prove WebKit rotte. Con la cache se ne installano solo i mancanti e nessuno si scarica.

Cache di GitHub: le voci salvate su main valgono per tutte le PR; quelle salvate in una PR solo per la stessa PR. La prima esecuzione su main dopo il merge riempie la cache per tutti. Spazio: circa 140 MB di `.deb` e alcune centinaia di MB di browser (compressi) per versione di Playwright (limite del repository 10 GB, le voci vecchie si cancellano da sole).

## Misure
Durata del passo «Browser per le prove» e del job intero (parte 1 / parte 2).

Prima (ultime 5 esecuzioni riuscite su main, 6 novembre):

| Esecuzione | Passo p1 | Passo p2 | Job p1 | Job p2 |
|---|---|---|---|---|
| 488 (PROMPT 72) | 52 s | 46 s | 18:12 | 23:50 |
| 486 (PROMPT 71) | 95 s | 112 s | 17:37 | 25:17 |
| 484 (PROMPT 70) | 42 s | 47 s | 15:10 | 20:17 |
| 480 (PROMPT 69) | 43 s | 38 s | 16:04 | 19:24 |
| 477 (PROMPT 68) | 67 s | 50 s | 17:30 | 20:07 |
| media | 60 s | 59 s | 16:55 | 21:47 |

Su main il mirror andava veloce; le cadute erano nelle PR: nella PR del PROMPT 72 la parte 2 è caduta 3 volte su 4 dopo 10 minuti (circa 30 minuti persi), la quarta ha impiegato 4 min 47 s per il solo passo.

Dopo, prima esecuzione della PR #195 (senza cache, mirror veloce quel giorno: 139 MB in 8 s): passo 57 s / 43 s, job 17:35 / 22:33, cache salvate. La seconda esecuzione (con la cache) è nella descrizione della PR #195.

## Prove locali dello script (Ubuntu 24.04, container)
- Senza cache: 93 pacchetti dal mirror, 32 s, dipendenze complete.
- Con cache (pacchetti tolti di nuovo): 9 s, nessun `apt-get update` né download.
- Limite forzato a 4 s per tentativo: il secondo tentativo scarica solo il resto («29.0 MB/30.5 MB»), poi il passo fallisce in modo pulito.

## Rischi
- Se un aggiornamento dell'immagine di GitHub rende i `.deb` in cache incompatibili, apt si ferma prima di cambiare qualcosa e lo script passa al mirror (lento come prima solo quella volta), poi salva una cache nuova.
- Con mirror lentissimo e senza cache (prima esecuzione dopo un cambio di versione di Playwright o di Ubuntu) due tentativi da 7 minuti scaricano fino a circa 200 MB a 240 kB/s: bastano per i 139 MB di oggi, non per un mirror ancora più lento.
