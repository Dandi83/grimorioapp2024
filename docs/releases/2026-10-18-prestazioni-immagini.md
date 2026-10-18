# Verifica del peso delle immagini

## Regressione segnalata e ritiro dell'esperimento

Alle 21:28 del 18 ottobre Daniele ha segnalato che, dopo il rilascio AVIF, il sito sembrava più lento e le foto caricavano in modo più scattoso su iPhone. I risparmi di byte riportati sotto restano misure corrette, ma non dimostrano un miglioramento della fluidità. Non erano disponibili un test fisico sul dispositivo né misure attendibili di LCP/decodifica.

Confronto `9613809` → `d4d9db9`: unica modifica applicativa `formats: ["image/avif", "image/webp"]` in `next.config.mjs`. Per ritirare la regressione senza altri cambiamenti è stata avviata la ripubblicazione in produzione del commit precedente `96138096486df4f4f4c7ae82baaf48676b1bcff7`, deployment `dpl_6npjg7EhTQB2DMqoZzQVwGso96NT`. Restano tutte le 336 illustrazioni, le fonti e i crediti compatti. Si torna al WebP predefinito Next. Nessun dato o codice mobile modificato.

AVIF può richiedere più tempo di prima codifica e decodifica; la causa esatta degli scatti sul dispositivo non è stata isolata. Non dichiarare risolta la fluidità su iPhone dal solo esito delle richieste HTTP. Il prossimo eventuale tentativo deve confrontare caricamento freddo/caldo e fluidità sul dispositivo/rete interessati; non riattivare automaticamente l'esperimento. Le sezioni successive descrivono il tentativo ritirato.

Rollback verificato: deployment READY, ilgrimorio.app risolve al commit `9613809`. Richiesta immagine Beholder a 828 pixel con Accept che include sia AVIF sia WebP: risposta `image/webp`, 75.486 byte e cache HIT. I file applicativi coincidono con la precedente versione verificata, che aveva superato test completi e build; non sono state introdotte altre modifiche funzionali. Il browser dell'utente potrebbe conservare varianti AVIF già scaricate: per un confronto immediato serve una sessione privata o una cache rinnovata.

Richiesta di Daniele: controllare l'impatto delle illustrazioni e, se utile, alleggerire mantenendo la qualità visiva. Base produzione `9613809`; branch `perf/avif-creature-images-20261018`. Nessun lavoro iPhone concorrente risultava nella chat dedicata.

## Misure sulla produzione prima dell'intervento

Le richieste reali all'ottimizzatore di ilgrimorio.app hanno confermato WebP, qualità richiesta 75 e risposta con `Vary: Accept`. Le varianti da 828 pixel hanno questi pesi effettivi:

| Immagine | WebP, byte | AVIF locale, byte | Riduzione |
| --- | ---: | ---: | ---: |
| Aboleth | 63.936 | 34.808 | 46% |
| Orsogufo | 52.868 | 36.493 | 31% |
| Beholder | 75.486 | 37.565 | 50% |
| Aquila | 29.216 | 15.315 | 48% |

Altri campioni WebP reali da 828 pixel: Lemure 81.030 byte; Drago rosso antico 40.244 byte. A 1200 pixel richiesti: Aboleth 87.160 byte, Beholder 89.192 byte, Orsogufo ancora 52.868 byte. Quest'ultimo mantiene la larghezza sorgente di 800 pixel: l'ottimizzatore evita già l'ingrandimento artificiale.

Le richieste ripetute alle varianti da 828 pixel hanno restituito `X-Vercel-Cache: HIT`; `Cache-Control: public, max-age=432000, must-revalidate`. Nessuna modifica alla durata della cache. La Home contiene una sola immagine e nessuna illustrazione di creatura; il bestiario non contiene elementi immagine. Le 336 illustrazioni non vengono caricate tutte nell'elenco.

HTML letto senza compressione: Home 17.807 byte, bestiario 1.128.720 byte, Orsogufo 41.471 byte. Questi numeri non misurano il trasferimento HTML compresso. Il catalogo serializzato è un possibile approfondimento separato: non è stato modificato in questo intervento.

## Ottimizzazione

Abilitata la negoziazione `formats: ["image/avif", "image/webp"]` nella configurazione Next. Si conserva la qualità richiesta 75, la risoluzione responsive, le proporzioni, la trasparenza e i file originali. I browser che non accettano AVIF ricevono ancora WebP.

Confronto locale eseguito con la stessa pipeline Sharp della versione Next installata: ridimensionamento senza ingrandimento, WebP 75 e AVIF 47/effort 3 (conversione qualitativa interna Next da 75 a 47). Per Aboleth e Orsogufo i pesi WebP locali coincidono con quelli serviti realmente. AVIF e WebP di Beholder sono stati confrontati visivamente; controllati anche Aboleth, Orsogufo e Aquila. La trasparenza di Beholder e Aquila è presente in entrambi i formati. Non sono stati osservati peggioramenti evidenti alla normale dimensione di consultazione; questo non equivale a compressione matematicamente senza perdita.

AVIF richiede una nuova variante in cache e può costare più tempo alla prima codifica. Non si attribuisce al sito il tempo totale delle richieste dall'ambiente di verifica: anche la Home già in cache ha mostrato circa sei secondi di attesa, quindi tali tempi includono la rete/proxy del sistema di misura e non rappresentano iPhone/4G. PageSpeed Insights mobile ha restituito HTTP 429: nessun punteggio Lighthouse, LCP o Core Web Vitals viene dichiarato verificato.

La verifica dell'anteprima deve controllare `Content-Type`, peso reale AVIF, fallback WebP, caricamento visivo e compatibilità prima del rilascio. Nessun nuovo servizio, acquisto o generazione di immagini. File condiviso modificato: soltanto `next.config.mjs`; fonti e crediti delle immagini invariati. Client iPhone separato.

## Esito dell'anteprima

Commit `4df343e427867149af36e8d9474c65c288ca85d8`, deployment `dpl_BwejRVqdKz5t6qpfjG3k89hbDGQN` READY. Richieste effettive allo stesso URL con `Accept: image/avif` oppure `Accept: image/webp`: formati corretti e fallback conservato. AVIF remoto a 828 pixel: Aboleth 35.194 byte, Orsogufo 37.007 byte, Beholder 38.141 byte, Aquila 15.654 byte. I valori WebP coincidono con la tabella iniziale. Risparmio effettivo circa 30–49%, 43% aggregato sui quattro campioni; non è una stima su tutte le 336 immagini.

Home e Aquila verificati nel browser: immagini caricate, aspetto e trasparenza conservati. `npm test` completo e `npm run build` superati. Pubblicazione dell'ottimizzazione nel branch `release/avif-images-20261018`, discendente della prova verificata; l'unica modifica applicativa è la configurazione dei formati, senza ricampionare o sostituire gli originali.
