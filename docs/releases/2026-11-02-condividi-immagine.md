# «Condividi come immagine» (PROMPT 50, 2 novembre 2026)

Branch `feat/card-condivisione-20261102`, da `main` dopo il PROMPT 49 (`3f0b1e0`).

## Cosa fa

- Il pulsante «Condividi» delle schede pubbliche apre un piccolo menu:
  - «🔗 Invia il link»: il comportamento di prima, identico (stesso testo, stesso link con `?ref=share`, stessi eventi `share_click` / `share_native` / `share_copy` / `share_cancel`);
  - «🖼️ Condividi come immagine»: apre l’anteprima della card con tre pulsanti, «Storia Instagram» (1080×1920), «Quadrato» (1080×1080), «Salva immagine» (scarica il formato mostrato). Sotto «Storia Instagram»: «Su Instagram aggiungi lo sticker Link per far aprire la scheda».
- Il menu si usa da tastiera (Tab, Invio, Esc) e si chiude con Esc o con un tocco fuori; la finestra dell’anteprima tiene il focus, si chiude con Esc o con la ×, e il focus torna su «Condividi».
- Condivisione:
  - con `navigator.canShare({ files })` il file va al menu del telefono; nel Quadrato anche il testo «<Nome> — Il Grimorio.App» e il link della scheda con `?da=amico` (didascalia di WhatsApp e Telegram); nella Storia solo il file;
  - senza condivisione di file (molti computer): il file viene scaricato;
  - chiudere il menu del telefono non è un errore (nessun messaggio, nessun evento).
- I due formati si preparano appena si apre la finestra, così il tocco apre subito il menu del telefono (iOS vuole il gesto dell’utente).

## Dove

Schede pubbliche, nell’edizione mostrata: incantesimi, mostri (SRD, NO SRD, redazione, community), oggetti magici, condizioni, armi, armature, oggetti d’avventura, strumenti, padronanze, proprietà, regole, talenti (solo con la sezione «Visibile»). Mai su liste, area riservata, schede nascoste con l’occhio, edizioni o raccolte nascoste, sezioni chiuse al pubblico (anche se l’admin le vede).

## Temi

| Tema | Schede |
| --- | --- |
| Scuro (gradiente #2B2118 → bordeaux scuro, testo #FFFBF0, ambra #E0A21A) | incantesimi, mostri senza immagine, condizioni, regole, talenti, padronanze |
| Immagine (foto a tutto sfondo, sfumatura scura in basso) | mostri della redazione o della community con immagine caricata (stesso dominio, `/immagini-mostri/…-l.webp`) |
| Pergamena (#F6EFDF, cornice #7A1F2B, testo #2B2118) | oggetti magici, armi, armature, oggetti d’avventura, strumenti, proprietà |

Riquadri: incantesimo → Lancio, Gittata, Componenti (solo le lettere), Durata; mostro → CA, PF (GS nella riga in alto); arma → Danni, Proprietà; armatura → CA, Categoria; strumento 2024 → Caratteristica; talento → Prerequisito (se c’è).

## Testo e attribuzione

- Estratto: l’inizio del testo della scheda com’è stampato, tolta solo la formattazione (tag, grassetti, a capo), tagliato a parola intera con «…» (al massimo 360 caratteri dal server, poi 3–4 righe nella card). Mai riscritto o riassunto.
- Mostri della redazione e della community: solo la descrizione, se visibile al pubblico (le sezioni nascoste sono già tolte da `publicSheet`).
- Riga di attribuzione sulle sole schede SRD: «Testo SRD 5.2.1 · CC BY 4.0 · Wizards of the Coast» (2014: «Testo SRD 5.1 · …»; le quattro condizioni 2014 tradotte da noi: «Da SRD 5.1, traduzione nostra · CC BY 4.0 · Wizards of the Coast»). L’attribuzione completa resta sulla scheda collegata e su /fonti: la CC BY 4.0 (sezione 3(a)(2)) ammette un’attribuzione ragionevole per il mezzo, anche rimandando a una risorsa che la contiene. Le schede NO SRD e i mostri originali non hanno la riga.

## Nome inglese

Schede SRD: il nome ufficiale (`lib/data/nomi-inglesi-srd.json`). Schede NO SRD: il nome approvato dall’admin vive solo nella ricerca (regola del PROMPT 37, «schede invariate»), quindi non entra nell’HTML della scheda: la finestra lo legge al tocco dall’indice pubblico già esistente `/ricerca-indice.json` (nessuna API nuova); i nomi protetti non sono mai nell’indice. Mostri originali: nessun nome inglese.

## Peso e tempi (misure locali, build di produzione con database di prova)

- Bundle iniziale delle pagine pubbliche principali (Home, Incantesimi, Bestiario, Palla di fuoco, Drago nero adulto, Compendio; 22 file): 284.919 → 285.861 B gzip (+942 B).
- Modulo caricato al tocco (anteprima + disegno): circa 4,9 KB gzip.
- Generazione di una card: mediana circa 50 ms, massimo sotto 100 ms; con CPU rallentata 4×: circa 260–290 ms (Storia) e 210–260 ms (Quadrato).
- Peso: tutte le card sotto 1 MB (PNG con gradiente verticale; JPEG per il tema immagine).

## Statistiche

Eventi nei lotti esistenti (`/api/analytics`, nessuna richiesta nuova): `share_image_open`, `share_image_sent`, `share_image_saved`, con il formato (colonna `share_from`) e il tipo di scheda (colonna `card_kind`). Gli arrivi dalla didascalia del Quadrato sono contati come `arrivo_da_amico`. In /admin/statistiche → Approfondimenti, card «Passaparola»: per formato (condivise / salvate) e per tipo di scheda (create / condivise / salvate), 24 ore e 7 giorni. Informativa /privacy aggiornata.

## File

- `lib/share-card.ts` (tipi, estratto, attribuzione), `lib/share-card-server.ts` (dati per tipo di scheda), `lib/share-card-draw.ts` (Canvas 2D, solo nel browser)
- `components/share-button.tsx` (menu), `components/share/share-image-dialog.tsx` (anteprima, caricata al tocco), `components/share/share-row.tsx`
- pagine delle schede in `app/…/[id]/page.tsx`, `lib/section-view.ts` (`sectionPublic`)
- `lib/analytics-events.ts`, `lib/analytics.ts` (`readShareImages`), `components/analytics-provider.tsx`, `components/statistics/insights-more.tsx`, `app/privacy/page.tsx`
- prove: `tests/share-card.cjs`, `tests/share-button-dom.cjs`, `e2e/condividi-immagine.spec.mjs`
