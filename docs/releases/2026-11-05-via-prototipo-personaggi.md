# Via il vecchio prototipo dei personaggi (PROMPT 60, 5 novembre 2026)

Passo G1 dell'integrazione con Total Party Kill (TPK): TPK crea i personaggi, il Grimorio li salva e li mostra. La pagina beta «I miei personaggi» arriverà in un prompt successivo. Il prototipo dell'officina non viene esteso: è stato tolto.

## Tolti
- `app/layout.tsx`: `CharacterSessionProvider`, che era caricato in ogni pagina.
- `app/globals.css`:
  - l'import di `components/characters/dashboard.css`;
  - gli stili del foglio A4 (`.paper-*` e la stampa con `.paper-view`).
- `components/characters/` (9 file), `app/personaggi/` e `app/account/`. La pagina /account era un'anteprima del prototipo: in produzione rispondeva 404 e rimandava a /personaggi.
- `public/character-sheet/`: le 4 pagine del foglio, 568 KB.
- Librerie del prototipo: `lib/characters.ts`, `lib/generated-character.ts`, `lib/character-dashboard.ts`, `lib/digital-sheet.ts`, `lib/paper-sheet.ts`, `lib/data/character-paper-fields.json`. Nessun altro file del repository le usava.
- Test e voci di `npm test`: `characters`, `paper-sheet`, `digital-sheet`, `generated-character`, `character-dashboard`.
- Documentazione del solo prototipo:
  - `docs/releases/2026-10-17-personaggi-*.md`, `2026-10-18-personaggi-plancia.md` e le 4 immagini `personaggi-*.jpg`;
  - `docs/superpowers/plans|specs/2026-10-17-personaggi*`.
  La cronologia resta in git.
- `components/layout/content-frame.tsx`: l'eccezione di larghezza per /personaggi.
- `tests/security-headers.cjs`: le due pagine dall'elenco controllato.

## Tenuti
- `robots.ts`: Disallow `/personaggi` e `/account`. La futura pagina sarà personale e non va indicizzata.
- `components/analytics-provider.tsx` e `tests/analytics-pages.cjs`: /personaggi e /account non contati nelle statistiche.
- `tests/service-worker.cjs`: la prova che /personaggi non viene mai salvato.
- `lib/manual.ts`, `lib/conditions.ts`, `lib/spells.ts` e gli altri moduli importati anche dal prototipo: li usano il resto del sito.
- Le note di rilascio miste, che parlano anche d'altro (pulizie, service worker, Google).

/personaggi risponde 404, senza rimandi, ed è libero per la pagina beta. Niente in sitemap, menu, ricerca o service worker.
