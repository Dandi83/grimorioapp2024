# Controllo di usabilità (PROMPT 56, 3 novembre 2026)

## Barra in basso ed elastico
- Problema visto da Daniele (iPhone, app installata, 3 novembre): la barra in basso sparisce o scivola fuori dallo schermo durante lo scorrimento, soprattutto in Home e nelle liste lunghe; in Home la pagina fa l'elastico in fondo.
- Cronologia: nessun commit dopo il PROMPT 27 (9d0a28d) ha toccato `components/bottom-nav.tsx`, `lib/viewport-anchor.ts` o le regole `overscroll-behavior` di `app/globals.css` (ancora presenti nel CSS pubblicato). La falla è nel PROMPT 27 stesso: togliendo l'ascolto dello scroll (che faceva saltare la barra durante il rimbalzo), una barra spostata in basso dopo la chiusura della tastiera (PROMPT 23: iOS lascia la parte visibile più in basso del viewport di layout) restava fuori dallo schermo finché non cambiava di nuovo la dimensione della parte visibile. iOS riallinea la parte visibile con lo scroll successivo, con un evento «scroll» del visual viewport e nessun «resize».
- Correzione: `bottom-nav.tsx` ascolta anche lo scroll (del visual viewport e della pagina), ma solo per **ridurre** lo spostamento già applicato, fino a 0; mai per aumentarlo, mai durante il rimbalzo (`bottomBarShift` restituisce null fuori da 0…massimo). Una barra in posizione non fa nulla allo scroll.
- Prove: `tests/viewport-anchor.cjs` aggiornato; `e2e/barra-scenario.mjs` simula la parte visibile spostata (tastiera aperta → chiusa con 120 px di scarto → scroll) e verifica che la barra torni a 844/915 px; usato da `e2e/barra-ferma.spec.mjs` (WebKit, iPhone 390 × 844, app installata, su /, /bestiario e una scheda) e dal nuovo `e2e/barra-ferma-android.spec.mjs` (Chromium, Pixel 412 × 915, Chrome e app installata, più lo scorrimento lungo di 4 pagine). La prova falliva prima della correzione («Received: translate3d(0px, 120px, 0px)») e passa dopo.
- Elastico in Home: non riproducibile su un computer (WebKit e Chromium non fanno il rimbalzo di iOS). Il CSS `overscroll-behavior-y: none` su html e body è in produzione. Ipotesi, nell'ordine: la stessa parte visibile spostata (la pagina sembra «staccata» dal fondo finché la barra non torna); un aggiornamento di iOS sul telefono dopo il 29 ottobre; il cambio di altezza della pagina quando la barra delle statistiche o la domanda «Come ti trovi?» spariscono. Da verificare sull'iPhone dopo la pubblicazione.

## Velocità
Misure in Chromium (iPhone 390 × 844, CPU 4 volte più lenta, rete 1,6 Mbit/s con 150 ms di latenza), mediana di 3 avvii a freddo, build di produzione sul database di prova. Vedi il REPORT PROMPT 56 per la tabella.

| Misura (mediana di 3) | prima del P43 (8471644) | prima del P55 (815ae61) | attuale (P56) |
| --- | --- | --- | --- |
| LCP Home / Incantesimi / Bestiario / scheda incantesimo / scheda mostro (ms) | 2496 / 1176 / 1240 / 1972 / 1272 | 2528 / 1148 / 1216 / 2000 / 1412 | 2508 / 1208 / 1212 / 2012 / 1300 |
| Caricamento completo (load) Home / Incantesimi / Bestiario (ms) | 2985 / 2523 / 2506 | 3058 / 2532 / 2565 | 2880 / 2634 / 2516 |
| Tempo bloccato (TBT) Home / Incantesimi / Bestiario / scheda mostro (ms) | 326 / 394 / 359 / 594 | 382 / 465 / 414 / 687 | 389 / 477 / 413 / 626 |
| JavaScript scaricato (compresso) Home / Incantesimi (B) | 181.114 / 198.044 | 181.683 / 199.126 | 181.743 / 199.182 |
| JavaScript eseguito all'avvio Home / Bestiario (B) | 697.048 / 973.521 | 701.991 / 976.529 | 702.211 / 976.748 |
| Tocco → schermo aggiornato / INP: ricerca generale (ms) | 80 / 152 | 66 / 152 | 87 / 152 |
| Tocco → schermo / INP: filtro Bestiario (ms) | 96 / 104 | 107 / 120 | 87 / 96 |
| Tocco → schermo / INP: apertura scheda (ms) | 28 / 48 | 40 / 48 | 44 / 64 |
| Tocco → schermo / INP: cambio tab classe (ms) | 129 / 136 | 112 / 120 | 108 / 112 |
| Navigazione Home → Incantesimi / Incantesimi → Bestiario / Bestiario → scheda / scheda → indietro (ms) | 445 / 203 / 261 / 371 | 341 / 229 / 259 / 453 | 483 / 243 / 265 / 385 |
| Service worker: attivo dopo (ms) / richieste nei primi 12 s / voci salvate | 236 / 30 / 30 | 149 / 29 / 29 | 338 / 29 / 30 |

Lettura: le differenze tra le tre build stanno dentro il rumore delle misure (poche decine di ms, ±1% sul JavaScript). Nessun rallentamento attribuibile a un commit tra il PROMPT 43 e oggi. La sensazione di app «meno scattante» non trova riscontro nel codice misurato qui; la causa più probabile è la barra spostata (lo scorrimento sembra «slegato» dal fondo) o il telefono stesso.

## Controllo di usabilità (solo elencato, non corretto)
Vedi il REPORT PROMPT 56: elenco per priorità con dove, cosa succede, dispositivi, costo e se cambia la grafica.
