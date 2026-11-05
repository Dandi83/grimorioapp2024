# Stile «pergamena illustrata», passo 2 (PROMPT 65, 5 novembre 2026)

Estende alle schede, alle intestazioni delle liste e al Compendio gli elementi comuni del PROMPT 64
(`app/globals.css`, classi `pg-*`; `components/pergamena/pergamena.tsx`). Regola: lo stile arricchisce titoli,
cornici e pulsanti, mai il testo delle schede.

## Elementi nuovi (solo CSS e componenti del P64)

- `Etichetta`: maiuscoletto sopra il titolo, fatto di etichette dell'app e di dati già mostrati. Le parole aggiunte
  dallo stile hanno `data-pg-nuovo` (le prove di confronto del testo le tolgono); `chiara` sulle testate colorate.
- `TimbroPresto`: il timbro inclinato «PRESTO» (`data-soon-tag`, `data-timbro-presto`); `Timbro` ha la variante
  `piccolo` e la classe `pg-timbro-chiaro` (ambra, sulla tessera scura «Creati da voi»).
- `.pg-attenuato`: le voci «In arrivo» non usano più l'opacità 60 %: testo `#6E5C4A` (≥ 4,8:1 anche sulla barra),
  icone al 55 %, timbro a colori pieni.
- `.pg-tessera` / `.pg-tessera-presto`: angoli di rame e ombra calda sulle tessere di Compendio ed Equipaggiamento.
- `.pg-capolettera-chiara`: capilettera del colore del testo sulle testate delle classi (il bordeaux non si leggerebbe).

## Dove

- Schede: incantesimi («INCANTESIMO · 3° LIVELLO · INVOCAZIONE», con il pallino della scuola e uno sfondo pergamena
  sotto l'etichetta sopra l'immagine), mostri («MOSTRO · GS 14», «ANIMALE · …», «CREATURA ORIGINALE · …»), oggetti
  magici («OGGETTO MAGICO · RARO»), armi, armature, oggetti d'avventura, strumenti, padronanze, proprietà, classi
  («CLASSE · SRD 5.2.1»), talenti («TALENTO · ORIGINI»), condizioni (l'etichetta già stampata «Condizioni»).
  Capilettera nel titolo (CSS `::first-letter`: il testo dell'H1 non cambia), divisore ✦ al posto della riga di 4 px.
  Angoli di rame solo sul riquadro dei dati in alto (striscia CA/PF/Iniziativa/GS, i quattro valori dell'incantesimo,
  peso/costo/gittata, dati principali della classe, tipo/rarità/sintonia dell'oggetto magico).
- Liste: solo l'intestazione (etichetta, capilettera, divisore) di /grimorio, /bestiario e raccolte delle creature
  originali, /oggetti-magici, /equipaggiamento e sottoliste, /talenti, /preferiti, /compendio/condizioni. Righe,
  filtri e ricerca invariati.
- Compendio: etichetta «REGOLE, EQUIPAGGIAMENTO E PERSONAGGI · SRD 5.2.1», capilettera, divisore, tessere con angoli;
  tessere «In arrivo» con «PRESTO»; tessera «I miei personaggi» con «BETA», visibile solo all'admin finché la sezione è
  nascosta (per il pubblico nessun link a /personaggi).
- «PRESTO» al posto della pillola «In arrivo» per tutti: barra in basso, colonna laterale, scorciatoie della Home,
  tessere, voci delle edizioni e dei filtri, blocchi «Ci stiamo lavorando», pagina «in costruzione» (nome + timbro sotto
  l'icona). Per l'admin le etichette di stato restano testuali («In arrivo»), come in /admin/sezioni.

## Verifiche

- Testo di `<main>` di 34 pagine (+6 in 2014, +3 admin) confrontato con main, togliendo `data-pg-nuovo`: identico
  ovunque tranne «In arrivo» → «Presto» e la nuova tessera admin.
- Contrasto (pixel delle lettere sullo sfondo reale): etichette 5,21–9,55 (minimo sulla testata del Chierico),
  etichetta dell'incantesimo sopra l'immagine 6,11, «PRESTO» 8,8–9,9, testi attenuati 7,39.
- Velocità (390 px 3×, CPU 4×, 3G veloce, mediana di 3): nessun peggioramento oltre il rumore; dettagli nel report.
- Prove: `e2e/pergamena.spec.mjs` (schede, liste, Compendio, «PRESTO», admin), `e2e/in-arrivo.spec.mjs`,
  `e2e/creature-originali.spec.mjs`, `tests/section-soon.cjs`, `tests/community.cjs`, `tests/magic-items.cjs`,
  `tests/conditions-list.cjs`.

Le card «Condividi come immagine» (PROMPT 50) non cambiano in questo passo.
