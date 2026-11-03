# Incantesimi e Bestiario scaricati una volta sola (PROMPT 58, 3 novembre 2026)

## Il problema
Il PROMPT 57 aveva notato che, quando il browser è libero dopo il caricamento della Home, partono due richieste di dati per /grimorio e due per /bestiario. Correzione rispetto a quel report: i circa 240 KB erano la pagina non compressa. Sulla rete le due richieste valgono:

- **dati per la navigazione** (router di Next.js, prefetch dalla barra in basso, `components/bottom-nav.tsx`): circa 25 KB compressi per Incantesimi e 16 KB per Bestiario, più una richiesta «albero» di circa 1,3 KB;
- **copia della pagina per l'offline** (service worker, messaggio «warm» da `components/service-worker.tsx`): circa 33 KB compressi per Incantesimi e 24 KB per Bestiario.

Le due richieste contengono la stessa lista in due formati: la prima serve per aprire la pagina subito, la seconda per vederla senza rete. Nessuna delle due può sostituire l'altra.

## Cosa cambia
- Il prefetch del router resta. Senza, la navigazione Home → Incantesimi passava da circa 570 a 1040 ms e Incantesimi → Bestiario da 280 a 515 ms (misure locali).
- Il service worker salva in anticipo le due liste solo nell'app installata sulla schermata Home (`isInstalled()`, `components/install/install-events.ts`), dove le liste offline sono attese.
- In una scheda del browser restano salvati in anticipo il Compendio e l'indice di ricerca. Incantesimi e Bestiario vengono salvati appena li apri, come tutte le altre pagine: è quello che promette /installa («le pagine già aperte restano leggibili anche senza rete»).
- `lib/sw/service-worker.js`: `WARM = ["/compendio", "/ricerca-indice.json"]`, `WARM_APP = ["/grimorio", "/bestiario"]`; le liste si aggiungono solo con `{ type: "warm", installed: true }`.

Nell'app installata le due richieste restano, ma solo al primo avvio di ogni versione del sito: nelle aperture successive la copia c'è già e non si riscarica.

## Misure
Condizioni del PROMPT 57: Chromium 390 px, CPU 4× più lenta, 3G veloce, mediana di 3 avvii. Build locale; prima = main 5b9ec2d, dopo = questa PR.

| | Prima (scheda) | Dopo (scheda) | Prima (app) | Dopo (app) |
| --- | --- | --- | --- | --- |
| Richieste dati /grimorio | 2 | 1 | 2 | 2 (solo 1° avvio per versione) |
| Richieste dati /bestiario | 2 | 1 | 2 | 2 (solo 1° avvio per versione) |
| Richieste del service worker (pagine) | 6 | 4 | 6 | 6 |
| Byte totali nei primi 15 s | 701.903 | 644.816 | 701.903 | 701.935 |
| Home → Incantesimi | 611 ms | 562 ms | 558 ms | 623 ms (rumore) |
| Incantesimi → Bestiario | 183 ms | 229 ms (rumore) | 183 ms | 253 ms (rumore) |

In locale le copie del service worker sono contate non compresse. In produzione, prima della modifica, la Home in una scheda scaricava 586.883 B nei primi 15 s (2 + 2 richieste per le liste).

## Prove
- `e2e/precarica-una-volta.spec.mjs`:
  - scheda del browser: al massimo una richiesta di dati per lista, nessuna copia del service worker, e la navigazione non ne aggiunge;
  - app installata: una copia e un prefetch per lista al primo avvio, nessun nuovo download dopo una ricarica.
- `tests/service-worker.cjs`: «warm» senza `installed` salva solo Compendio e indice; con `installed: true` aggiunge le due liste, una volta.
- `e2e/offline.spec.mjs` simula l'app installata, cioè il caso in cui le liste offline sono attese.
- `e2e/app-leggera.spec.mjs` è aggiornato al nuovo elenco.
