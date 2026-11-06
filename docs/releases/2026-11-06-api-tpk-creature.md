# Elenco pubblico delle creature originali per Total Party Kill (PROMPT 66, 6 novembre 2026)

Total Party Kill (https://www.totalpartykill.app) legge dal suo server l'elenco delle creature originali del Grimorio per «Evoca dal Grimorio.App» e «Mostro della settimana».

## Indirizzo
`GET https://ilgrimorio.app/api/tpk/creature-originali` (`app/api/tpk/creature-originali/route.ts`).
- Solo GET; gli altri metodi rispondono 405 (Next.js).
- `Content-Type: application/json; charset=utf-8`, `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`: lo tiene la cache della rete di Vercel per un'ora, poi per un giorno serve la copia vecchia mentre ne prepara una nuova.
- Route dinamica (`force-dynamic`): niente `revalidate`, niente ISR, nessuna scrittura nel database, nessun CORS, nessun log.
- Se il database non si legge risponde 503 `no-store`: mai un elenco fatto con «tutto visibile».
- Non è in sitemap, service worker, ricerca o statistiche. Il bundle pubblico è identico a prima.

## Chi entra
Le regole sono in `lib/tpk-creatures.ts` (`tpkVisible`). Sono le stesse di `/mostro/<id>`, più severe in tre punti:
- solo righe di `grimorio_homebrew`, cioè creature già pubblicate: mai proposte da vedere o rifiutate;
- Bestiario visibile, parte «Mostri del Grimorio» (redazione) o «I mostri creati da voi» (community) visibile, edizione 2024 visibile; «In arrivo» conta come nascosta;
- scheda non nascosta con l'occhio;
- **più severo**: mai 2014; «Entrambe» entra solo se la 2024 è visibile;
- **più severo**: con la «Modalità solo SRD» accesa l'elenco è vuoto (sul sito la modalità non tocca le creature originali);
- **più severo**: una creatura della community senza licenza accettata (proposta prima della licenza) non entra.
Lo stato di visibilità è quello in cache del sito (`publicVisibilityState`, aggiornato da ogni interruttore admin), senza i cookie dell'admin: la risposta è la stessa per tutti.

## Cosa esce
`{ versione: 1, generato_il, fonte, nota_licenza, creature: [...] }`, dalla più recente (`pubblicata_il`).
Per ogni creatura:
- `id`, `url`, `origine` («redazione» / «community»), `autore` (null per la redazione);
- `licenza` e `licenza_url`: per la community la licenza della riga + `HOMEBREW_LICENSE_URL`; per la redazione «© 2026 Il Grimorio.App – uso consentito a Total Party Kill» + /info;
- `verificato`, `giudizio_bilanciamento`: «In linea» solo quando la scheda mostra «Bilanciamento verificato», altrimenti null. Il giudizio salvato per l'admin non esce mai;
- `pubblicata_il`, `aggiornata_il`;
- `immagine`: URL assoluto della WebP media (`/immagini-mostri/<v>-m.webp`), alt e crediti; solo redazione;
- `scheda`: i campi di `HomebrewDraft` copiati per nome (`tpkSheet`), con `publicSheet` che toglie prima le sezioni nascoste. Per la redazione anche storia, tattiche, tana, agganci e varianti, solo se non sono nascoste. `testo_ricco` sempre presente. Un campo nuovo della bozza non esce da solo.

Non escono mai: email, nickname della proposta, id della proposta, note e motivi dell'admin, cronologia, IP, token, impronta, `bilanciamento`, `sezioni_nascoste`, colonne interne.

## Prove
- `tests/api-tpk-creature.cjs` (in `npm test`): regole su righe inventate, chiavi e testi privati, file della route, assenza da sitemap e service worker.
- `e2e/api-tpk-creature.spec.mjs`: database di prova; redazione con sezioni nascoste e community con autore e licenza; esclusi 2014, senza licenza, proposte, occhio, parti «In arrivo»/«Nascosta», modalità solo SRD; header esatti, 405, stessa risposta per l'admin; ripulisce tutto alla fine.

## PROMPT 67 — licenza della redazione senza «D.d.B.» (6 novembre 2026)

Decisione di Daniele dopo il REPORT 66: per le creature della redazione il campo `licenza` è «© 2026 Il Grimorio.App – uso consentito a Total Party Kill» (`TPK_EDITORIAL_LICENSE` in `lib/tpk-creatures.ts`), `licenza_url` resta /info. Il resto dell'endpoint non cambia. `tests/api-tpk-creature.cjs` e `e2e/api-tpk-creature.spec.mjs` controllano il testo nuovo e che «D.d.B.» non compaia in tutto il JSON. La firma «© 2026 D.d.B. – Il Grimorio.App» delle pagine legali (PROMPT 63) resta com'è.
