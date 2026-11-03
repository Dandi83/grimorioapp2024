# App più veloce e 4 correzioni dal controllo di usabilità (PROMPT 57, 3 novembre 2026)

## Parte A — correzioni
- A1 `lib/scroll-lock.ts`: i pannelli (ricerca generale, foglio dell'edizione, schermata «Scegli l'edizione») tengono ferma la pagina con il body fisso alla posizione corrente (`position: fixed; top: -scrollY`), che iOS rispetta; alla chiusura la posizione torna esatta. Più pannelli sovrapposti: si libera con l'ultimo.
- A2 `lib/sw/service-worker.js`: salvate per l'uso offline anche /talenti, padronanze e proprietà delle armi, le tre raccolte del Bestiario e /installa. L'elenco è ancorato all'intero indirizzo già normalizzato: /admin, /api, barre doppie o codificate non passano (prove in `tests/service-worker.cjs`).
- M3 `components/catalog-ui.tsx`: il riquadro di ricerca delle liste è una `<label>`: un tocco in qualunque punto apre la tastiera.
- M5 `lib/page-room.ts`: lo spazio della barra delle statistiche e quello della domanda «Come ti trovi?» si liberano solo quando il lettore è lontano dal fondo (o cambia pagina): niente salto. Una pagina che sta in uno schermo si libera subito.
- Prove: `tests/velocita-57.cjs`, `e2e/pannelli-scroll.spec.mjs`.

## Parte B — velocità
Misure e scelte nel REPORT PROMPT 57 (stesse condizioni del PROMPT 56: Chromium 390 px, CPU 4× più lenta, 3G veloce, mediana di 3 avvii a freddo).

### Cosa è stato tenuto
- Immagini hero (Home, scheda incantesimo): `fetchPriority="high"` oltre a `priority`.
- Statistiche, badge dell'app e Vercel Analytics caricati dopo il load, quando il browser è libero (`components/layout/late-extras.tsx`); gli eventi lanciati prima (una condivisione, un voto) sono tenuti e rimandati quando il provider ascolta.
- «Come ti trovi?» e la card «Sostieni» della Home caricate allo stesso modo (`components/home/late-boxes.tsx`); la card «Porta il Grimorio al tavolo» resta disegnata dal server.
- Schermata «Scegli l'edizione» in un chunk separato, scaricato solo alla prima visita.

### Misure (build locale, prima = main 266f212, dopo = questa PR)
| | LCP | TBT | JS scaricato (gz) | JS eseguito al load |
| --- | --- | --- | --- | --- |
| Home | 2524 → 2376 ms | 262 → 224 ms | 181.743 → 174.436 B | 592.923 → 570.677 B |
| Incantesimi | 1168 → 1152 | 295 → 252 | 199.182 → 194.371 | 815.796 → 801.406 |
| Bestiario | 1220 → 1196 | 328 → 265 | 199.182 → 194.371 | 793.026 → 778.636 |
| Scheda incantesimo | 1968 → 1968 | 272 → 339 (rumore) | 179.100 → 174.262 | 592.828 → 578.425 |
| Scheda mostro | 1240 → 1228 | 359 → 352 | 176.075 → 171.237 | 602.083 → 587.653 |

Navigazione Home → Incantesimi 415 → 357 ms; le altre entro il rumore. Il rumore tra due misure della stessa build è di 50–150 ms sul TBT.

### Perché gli obiettivi non sono raggiunti senza cambi visibili
- LCP Home: l'elemento è l'immagine della biblioteca (81 KB alla larghezza richiesta da un iPhone, 1024 px). Con la rete a 1,6 Mbit/s compete con 174 KB di JavaScript (di cui ~120 KB sono React e Next, non riducibili) e 122 KB di caratteri. Prove: senza l'immagine l'LCP sarebbe il titolo a ~1.150 ms; senza gli script 1.630; senza i caratteri 1.900. Per stare sotto 1.800 ms servono meno byte prima dell'immagine o un'immagine più leggera (vedi sotto). Sul server di prova (HTTP/1.1) la priorità alta non cambia l'ordine; in produzione (HTTP/2) sì: misure su ilgrimorio.app nel report.
- TBT delle liste: è l'idratazione di 700 incantesimi / 330 creature (dati nel payload della pagina, 240 KB) più il runtime: ridurlo sotto 200 ms vuol dire cambiare come le liste arrivano al browser.
- Navigazione: le pagine della barra sono già precaricate (3 s dopo il load); i 350–400 ms sono il rendering della lista con la CPU 4× più lenta.
