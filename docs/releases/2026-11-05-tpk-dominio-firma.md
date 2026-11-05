# Nuovo indirizzo di Total Party Kill e firma «D.d.B.» (PROMPT 63, 5 novembre 2026)

## Indirizzo di TPK
- Total Party Kill ha un dominio suo: `https://www.totalpartykill.app`.
- È definito in un solo posto, `lib/tpk.ts`:
  - `TPK_URL`;
  - `TPK_CREATE_URL` = `/crea?ritorno=grimorio`;
  - `tpkImportUrl(hash)` = `/importa#pg=…`.
- È una costante, non una variabile d'ambiente: cambiarla richiederebbe di toccare Vercel.
- Lo usa `components/characters-beta/characters-app.tsx` per «＋ Crea il tuo personaggio» e «🎲 Gioca in Total Party Kill».
- Nel codice, nelle prove e nella documentazione non resta il vecchio indirizzo su vercel.app; lo controlla `tests/personaggi-beta.cjs`.
- `lib/shared/README.md` resta com'è: cita il repository `Dandi83/total-party-kill`, che è un nome di repository e non un indirizzo web.

## Origini consentite
- Il Grimorio apre TPK solo con link, in una nuova scheda, e non carica nulla da lì: non serve nessuna voce nella CSP (`lib/security-headers.mjs`).
- La CSP regola script, connessioni e frame, non i link.
- I controlli `origin` delle API (statistiche, segnalazioni, proposte, area riservata) accettano solo il sito stesso, e TPK non le chiama.
- Non ho aggiunto niente.

## Firma
«© 2026 D.D.B. – Il Grimorio.App» diventa «© 2026 D.d.B. – Il Grimorio.App» nelle 3 righe di `components/legal/copyright.tsx` e nei testi attesi di `e2e/diritti-autore.spec.mjs`, compreso il controllo che sulle schede SRD la firma non compaia. Nel resto del repository «D.D.B.» non compariva.
