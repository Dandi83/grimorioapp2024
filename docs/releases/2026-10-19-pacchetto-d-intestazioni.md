# Pacchetto D — intestazioni di sicurezza e area riservata non indicizzata — 19 ottobre 2026

Branch `fix/intestazioni-sicurezza-20261019`, base `main` a `3db095d`. Punti S6 e S7 del rapporto.

## Modifiche

- S6: su tutte le pagine `X-Frame-Options: DENY` e `Content-Security-Policy: frame-ancestors 'none'`. Nessun altro sito può mostrare le pagine dentro una cornice (protezione dal clickjacking sull'area riservata). La policy limita solo le cornici: script, stili, immagini e font funzionano come prima. Una CSP completa resta rimandata.
- S7: `/admin` e `/admin/statistiche` dichiarano `robots: noindex, nofollow`, come già `/personaggi` e `/account`.
- Verificato prima della modifica: il branch iPhone `cloud/grimorio-ios-20261018` non incorpora il sito in iframe né usa `server.url`.
- Nota: l'anteprima v0 in iframe citata in `lib/admin-auth.ts` non è più usata; con queste intestazioni non funzionerebbe.

## Verifiche

- Nuovo `tests/security-headers.cjs` (intestazioni da `next.config.mjs`, noindex delle pagine private), incluso in `npm test`.
- `npm test`, `npx tsc --noEmit`, compilazione `next build`: superati.
