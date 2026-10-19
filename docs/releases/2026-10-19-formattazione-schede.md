# Formattazione uniforme delle schede — 19 ottobre 2026

Richiesta di Daniele: stessa formattazione su tutte le schede di incantesimi e bestiario. Proposta approvata sull'esempio del Mago.

## Regole (applicate in visualizzazione, `components/html-text.tsx`)

1. Nomi di tratti e azioni: grassetto oro, invariato.
2. Formule di gioco sempre in corsivo e testo chiaro, anche se la fonte non le aveva in corsivo: «Tiro per colpire…:», «Attacco con arma…:» (2014), «Colpito:», «Mancato:», «Tiro salvezza su …:», «Tiro salvezza fallito/superato:», «Fallimento:», «Successo:», «Fallimento o successo:», «Primo/Secondo fallimento:», «Attivazione:», «Esito:», «Effetti aggiuntivi:», «Utilizzi di azioni leggendarie:». Se la formula è già in grassetto resta in grassetto.
3. Nomi di incantesimi del catalogo in corsivo; link alla scheda dove già previsto (non sulle schede 2014).
4. Liste di incantesimi divise per frequenza, anche sulle creature 2014 (senza link).
5. Ogni altro corsivo della fonte o dell'editor admin viene mostrato in tondo.

## Cosa non cambia

- Nessun dato salvato viene modificato: database, fixture SRD e modifiche admin restano identici.
- Tabelle (`<pre>`), titoli «Utilizzo di uno slot…», icone dei danni e link alle condizioni invariati.
- I corsivi impostati a mano nell'editor admin restano salvati, ma sul sito si vedono solo su nomi di incantesimi e formule.

## Verifiche

- `tests/sheet-emphasis.cjs` (nuovo): stessa resa tra scheda ufficiale e scheda senza corsivi, formule spezzate, corsivi sparsi, grassetti, tabelle, liste per frequenza.
- `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run test:e2e` superati.
