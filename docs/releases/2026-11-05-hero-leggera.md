# Immagine della Home più leggera sui telefoni (PROMPT 59, 5 novembre 2026)

Daniele ha approvato il confronto «1024 px qualità 75 (81 KB) → circa 828 px qualità 60 (45 KB)» per la biblioteca della Home (`public/hero-atmosfera.webp`).

## Strada scelta
- `components/home/hero-picture.tsx`: un `<picture>` costruito con `getImageProps` di next/image (stesso ottimizzatore e stessi indirizzi `/_next/image`).
  - `<source media="(max-width: 672px)">`: candidati 640, 750 e 828 px a qualità 60, mai più larghi di 828 px, nemmeno con schermi 3×.
  - `<img>`: per tablet e computer, gli stessi candidati, le stesse `sizes` e la stessa qualità 75 di prima.
- Precaricamento: due `<link rel="preload">` nell'HTML, uno per media query (`(max-width: 672px)` e il suo esatto contrario `not all and (max-width: 672px)`). Ognuno nomina gli stessi file del `<picture>`, con `fetchPriority="high"`: un solo download.
- `next.config.mjs`: `images.qualities: [60, 75]`. Next 16 accetta solo le qualità elencate; 75 resta per tutte le altre immagini.
- Restano uguali alt, posizione (`styles.image`), sfumatura, `loading="eager"` e `fetchPriority="high"`.
- La schermata «Scegli l'edizione» del primo avvio usa lo stesso componente. Sul telefono riusa il file già scaricato dalla Home, senza un secondo download.

## Misure locali
Condizioni: Chromium 390 px con schermo 3×, CPU 4× più lenta, 3G veloce, mediana di 3.

| | prima | dopo |
| --- | --- | --- |
| Telefono 390 px, file | w=1200 q=75, 81.734 B | w=828 q=60, 39.572 B |
| Telefono, LCP | 2468 ms | 1444 ms |
| Computer 1280 px, file | w=1080 q=75, 81.734 B | uguale |
| Computer, LCP | 2444 ms | 2356 ms (rumore) |

Nell'emulazione di Chromium, uno «schermo» più stretto della finestra (per esempio telefono 390 px con finestra 1280 px) fa partire anche il file del telefono. Succede perché la prima lettura della pagina usa la larghezza dello schermo. Nei dispositivi reali schermo e finestra coincidono: un solo download in Chromium e WebKit, anche a 672 e 673 px e con il telefono in orizzontale.

## Prove
- `e2e/hero-leggera.spec.mjs`, quattro controlli:
  - telefono a 390 px (3×): un solo file, larghezza ≤ 828, qualità 60;
  - primo avvio: nessun secondo download;
  - computer a 1280 px: w=1080, qualità 75, come prima;
  - precaricamenti uguali alle sorgenti del `<picture>`.
- Aggiornati: `tests/velocita-57.cjs` e `tests/user-edition.cjs` (finto `getImageProps`).
