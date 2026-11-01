# «App più leggera» (PROMPT 43, 1 novembre 2026)

Interventi 1, 2, 4, 9 e 10 del controllo «PROMPT SICUREZZA 2». Nessun cambio grafico.

## 1 — Preferiti senza il catalogo
- `/preferiti` non porta più tutti gli incantesimi e i mostri: la pagina passa solo `unavailable`.
- Le righe arrivano da `GET /preferiti/schede?s=<id incantesimi>&m=<id mostri>` (`app/preferiti/schede/route.ts`), che restituisce solo le schede chieste. Le regole sono quelle che la pagina applicava prima:
  - sezioni, edizioni e raccolte nascoste;
  - schede nascoste con l'occhio, segnate «Non disponibile» per il pubblico;
  - modalità solo SRD;
  - per l'amministratore, tutto.

  La risposta ha `private, no-store`: dipende dalla sessione.
- Fonte scelta: un percorso dedicato e leggero più una copia sul dispositivo. `/api/catalogo/*` toglie le schede nascoste, mentre Preferiti deve mostrarle segnate; l'indice di ricerca non ha i campi delle righe.
- Copia sul dispositivo: `grimorio.favorites.cards.v1` (`lib/favorite-cards.ts`), con le righe e gli id chiesti. Preferiti si apre subito con la copia e la aggiorna dalla rete. Offline mostra la copia.
- La lista dei preferiti (`grimorio.favorites.v1`) non viene mai riscritta: nessuna migrazione.
- Senza preferiti la pagina non fa nessuna richiesta.
- Se i preferiti cambiano su altre pagine, la copia si aggiorna quando il browser è libero (`components/favorites-provider.tsx`).
- Limite: una scheda aggiunta offline e mai vista online compare solo con la connessione. Al suo posto c'è la frase «Sei offline: alcuni preferiti si vedranno con la connessione».

## 4 — Service worker
- All'installazione si salva solo `/`.
- `/grimorio`, `/bestiario`, `/compendio` e `/ricerca-indice.json` si salvano col messaggio `warm`, che la pagina manda quando il browser è libero: requestIdleCallback con limite di 10 s; su Safari, che non lo ha, un'attesa di 2 s.
- `/preferiti` non viene più salvato in anticipo: resta la copia della pagina visitata (network first, come tutte).
- Nuovo nome della cache: `grimorio-pages-2-<VERSION>` (`CACHE_SCHEMA`).

## 2 — Invito «Installala»
- Stesso aspetto, testo e posizione.
- Compare al primo `pointerdown`, `scroll` (anche dentro un riquadro) o `keydown`: un solo ascoltatore passivo che si toglie da solo, nessun timer.
- I gesti fatti con la barra statistiche o la schermata iniziale aperte non contano.
- Restano tutte le regole precedenti: «Chiudi» per 7 giorni, mai ad app installata, mai insieme alla barra o alla domanda della Home.
- Eventi:
  - riusati: `install_prompt_shown` (mostrato) e `app_installed` (completato, evento `appinstalled`);
  - nuovi: `install_prompt_tapped` (pulsante, «Come si fa» o «Copia il link») e `install_prompt_closed`.
- In area riservata: Statistiche → Approfondimenti → «Funzioni», tabella sotto «Avviso di installazione», visitatori distinti nelle ultime 24 ore e 7 giorni (`readInstallInvite`, `lib/analytics.ts`).

## 9 / 10 — Lint e pulizia
- `components/catalog-browsers.tsx`: `useCatalogSearch` legge l'indirizzo con `useSyncExternalStore`.
- `components/characters/workshop.tsx`: i dialoghi dipendono da valori booleani.
- Eliminato `components/admin-source-label.tsx`, non usato.
- Tolte le variabili inutilizzate in `app/actions/admin-push.ts`, `components/characters/dashboard.tsx` e `editor.tsx`.
- Avvisi del lint nel codice dell'app (escluso `.claude/`): 47 → 38.

## Misure (Lighthouse 12.8.2 mobile, mediana di 3, build locale con database di prova)
Vedi il report di PROMPT 43.
- `/preferiti` HTML: 337.765 → 24.798 byte (gzip 38.901 → 5.274).
- Copie del service worker alla prima visita: 1.052.726 → 714.970 byte.
