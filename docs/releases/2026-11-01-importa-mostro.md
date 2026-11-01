# «Importa mostro», sezioni nuove e immagine dei mostri della redazione (PROMPT 44, 1 novembre 2026)

Solo per i mostri «Dalla redazione». Le schede SRD, NO SRD e della community non cambiano. Il pubblico non vede nulla
di nuovo finché un mostro della redazione non ha sezioni compilate e visibili, o un'immagine.

## Campi nuovi (migrazione solo additiva)
- I campi sono chiavi facoltative della bozza già salvata in `grimorio_homebrew.scheda` (JSON). Nessuna colonna cambia,
  nessun dato esistente viene toccato. Le chiavi:
  - `storia`, `tattiche`, `tana`, `agganci`, `varianti`: testo con paragrafi separati da una riga vuota,
    `**grassetto**` e `*corsivo*`;
  - `sezioni_nascoste`: elenco delle sezioni nascoste al pubblico, predefinito vuoto, cioè tutte visibili;
  - `immagine` `{ v, w, h }`, `immagine_alt`, `immagine_crediti`;
  - `testo_ricco`: vale solo per i mostri importati, dove gli asterischi diventano grassetto e corsivo.
- Le sezioni che si possono nascondere sono descrizione, tratti, azioni, azioni bonus, reazioni, azioni leggendarie e le
  cinque nuove. Intestazione, statistiche e caratteristiche sono sempre visibili.
- Tabella nuova `grimorio_monster_images` (`versione`, `misura` s/m/l, `larghezza`, `altezza`, `byte`, `webp`), creata
  al primo caricamento di un'immagine.
- Il modulo pubblico «Proponi» non può mai impostare questi campi: `parseDraft` li ignora. Li legge solo
  `parseEditorialExtras` (`lib/editorial-draft.ts`) nelle azioni admin.

## Pagina pubblica
- Ordine: caratteristiche → tratti → azioni → azioni bonus → reazioni → azioni leggendarie → Storia e leggenda →
  Tattiche → Tana → Agganci per l'avventura → Varianti.
- Stile: lo stesso componente delle altre sezioni (`components/monster-sheet.tsx`), quindi condizioni come pillole e
  grassetti bordeaux.
- `lib/public-sheet.ts` toglie le sezioni nascoste prima che la pagina e i suoi metadati le disegnino. Il simulatore del
  bilanciamento legge invece la scheda completa.
- Le sezioni non entrano mai in `/api/catalogo/*`, nell'indice di ricerca né nel service worker.
- Immagine sotto l'intestazione e sopra la descrizione, con `srcset` a 3 misure e larghezza e altezza riservate (CLS 0).
  Si carica subito perché è nella prima schermata. Servita da `/immagini-mostri/<versione>-<s|m|l>.webp` con cache di un
  anno, solo se la scheda è visibile; per l'admin è servita senza cache. Non è nel precaricamento del service worker.

## Area riservata
- Editor dei mostri della redazione:
  - accanto al titolo di ogni sezione l'occhio «Visibile / Nascosta», salvato con il resto;
  - una sezione nascosta mostra «Nascosta al pubblico» nell'editor e nell'anteprima;
  - le 5 sezioni nuove sono sotto le Azioni leggendarie, poi il campo Immagine (JPG/PNG), «Testo alternativo»
    (obbligatorio con l'immagine) e «Crediti».
- Immagine: il browser rimpicciolisce la foto (al massimo 2400 px); il server (`/api/admin/immagine-mostro`, solo admin
  e solo dallo stesso sito) la converte con `sharp` in WebP sotto i 150 KB, in 3 misure (480, 800 e 1200 px, mai
  ingrandite).
- «Importa mostro»: `/admin/mostri/importa`. Ci si arriva dal pulsante nella lista dei mostri e da «Nuova creatura».
  Si incolla il JSON, poi:
  - «Controlla» mostra errori e avvisi, senza salvare;
  - l'anteprima mostra la scheda come sul sito;
  - «Salva» crea il mostro «Dalla redazione», 2014 e 2024, nascosto con l'occhio, con il bilanciamento calcolato;
  - se esiste già un mostro con lo stesso id o nome, compare un riepilogo dei campi con «Sovrascrivi» e «Annulla».
- Le regole del controllo sono in `lib/monster-import.ts`.

## Librerie
Nessuna libreria nuova. `sharp` 0.35.5 è già installato come dipendenza di Next.js (`package-lock.json`). Viene caricato
solo dal server, al caricamento di un'immagine.
