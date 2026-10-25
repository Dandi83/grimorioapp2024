# Product

<!-- impeccable:product-schema 1 -->

<!-- Written on 25 Oct 2026 from Daniele's brief for the Impeccable proposals and from AGENTS.md / docs/;
     no interview round was run in that session. Facts below come from those two sources. -->

## Platform

web

## Users

Dungeon Master e giocatori di Dungeons & Dragons quinta edizione (regole 2014 e 2024) che parlano italiano. Lo usano soprattutto dal telefono (Chrome su iPhone, spesso come app aggiunta alla schermata Home), anche al tavolo durante le sessioni: cercano un incantesimo, una creatura o una regola e devono leggerla in fretta, con una mano, magari con poca luce.

Un secondo utente è l'amministratore (Daniele), che dall'area riservata corregge, aggiunge, nasconde e verifica schede e sezioni, anche lui spesso da telefono.

## Product Purpose

Il Grimorio.App è un'app gratuita che raccoglie in italiano il materiale SRD di D&D 5e — incantesimi, bestiario, classi, equipaggiamento, oggetti magici, condizioni e regole — per le edizioni 2014 (SRD 5.1) e 2024 (SRD 5.2.1). Riuscire significa trovare la scheda giusta in pochi secondi e leggerla senza fatica su uno schermo piccolo.

## Positioning

Un solo posto, in italiano, con i testi SRD riportati fedelmente e le due edizioni tenute separate (l'utente sceglie la sua edizione una volta sola). Fonti e licenze sono dichiarate sulla scheda stessa. Le schede si possono condividere con un link pubblico.

## Operating Context

- Uso al tavolo da gioco: consultazione rapida, interruzioni frequenti, telefono tenuto in mano o appoggiato.
- Navigazione inferiore fissa: Home (ricerca generale), Incantesimi, Bestiario, Compendio, Preferiti.
- Il service worker tiene disponibili offline le pagine pubbliche già aperte (avviso «copia salvata»).
- L'area riservata (`/admin`) funziona sullo stesso sito ed è usata anche da telefono.

## Capabilities and Constraints

- Next.js 16 (App Router) su Vercel, Tailwind CSS 4; un unico database condiviso da anteprime e produzione.
- I testi di incantesimi, mostri, regole e Compendio devono restare fedeli all'SRD: il lavoro di design riguarda solo stile e impaginazione.
- Le schede mostro seguono sempre l'ordine caratteristiche → tratti → azioni → reazioni → azioni leggendarie.
- Negli elenchi pubblici e nei preferiti niente etichette edizione; nelle schede l'etichetta dell'edizione è scura, con icona libro e anno.
- Le etichette «Aggiunta da te» e «Sintesi originale» sono solo per l'amministratore; «NO SRD» è pubblica.
- Statistiche solo con consenso facoltativo.
- Immagini: WebP predefinito. Il passaggio ad AVIF è stato ritirato dopo che Daniele ha notato scatti su iPhone.
- Autenticazione, passcode admin, variabili d'ambiente e invio email (Resend) non si toccano nel lavoro di design.

## Brand Commitments

- Nome: «Il Grimorio.App», con «.App» in evidenza nell'intestazione.
- Identità visiva approvata da Daniele il 20 ottobre 2026: tema chiaro unico color pergamena (#F6EFDF), testo #2B2118, bordeaux #7A1F2B, ambra #E0A21A; EB Garamond per i titoli e Source Sans 3 per il testo. Le proposte rifiniscono questo stile, non lo sostituiscono.
- Lingua: italiano semplice.

## Evidence on Hand

- Testi SRD 5.1 e 5.2.1 in italiano in `lib/data/`, con attribuzioni in `/fonti`.
- Immagini d'atmosfera in `public/` (per esempio `hero-atmosfera.webp`).
- Non abbiamo testimonianze, numeri di utenti né recensioni da mostrare: non vanno inventati.

## Product Principles

1. Leggere prima di tutto: testo grande, contrasto alto, niente scroll orizzontale sul telefono.
2. Fedeltà alla fonte: lo stile non cambia mai il testo SRD.
3. Pochi tocchi: le azioni frequenti sono raggiungibili con il pollice e hanno aree di tocco di almeno 44 px.
4. Le due edizioni sono sempre distinte e dichiarate, senza confonderle negli elenchi.
5. Lo stesso aspetto per tutte le schede, siano SRD, modificate, aggiunte o homebrew.

## Accessibility & Inclusion

- Contrasto del testo di almeno 4,5:1 su ogni superficie. L'ambra serve da riempimento, mai da colore del testo.
- Aree di tocco di almeno 44×44 px.
- Il testo deve restare leggibile anche quando l'utente ingrandisce i caratteri dalle impostazioni di iOS.
