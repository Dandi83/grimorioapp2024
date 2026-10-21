# Segnalazioni anonime e amministrazione — 21 ottobre 2026

Ramo `feat/segnalazioni-20261021`, base `main` 9a3363c (ricerca generale #54). Non unito: attende l'OK di Daniele.

## Cosa cambia per chi usa il sito
- Nuova pagina `/segnala`: tipo (Errore · Mancanza · Consiglio), riga «Riguarda: <scheda> (<edizione>)» con «Rimuovi», messaggio da 10 a 2000 caratteri con contatore, email facoltativa, «Invia segnalazione». Dopo l'invio: «Grazie!».
- Ingressi: «Segnala un errore o un consiglio» in fondo alla Home; link «Segnala» in fondo alle schede (incantesimi, mostri, armi, armature, equipaggiamento d'avventura, strumenti, oggetti magici, condizioni del Manuale, elenco Condizioni). L'edizione è quella visibile sullo schermo al momento del tocco.
- Offline la pagina si apre (copia salvata), l'invio no: messaggio chiaro, testo conservato, nessun invio differito.
- `/privacy`: nuova sezione «Segnalazioni» su cosa viene salvato.

## Dati e anonimato
- Tabella `grimorio_feedback_reports` (Drizzle `feedbackReports` in `lib/db/schema.ts`): id, creato_il, tipo, messaggio, percorso, edizione, email_risposta, stato (nuova | letta | risolta | archiviata), email_inviata, nota_admin.
- Nessun IP, user agent o cookie salvato, nessun cookie nuovo. Il limite invii usa una tabella separata `grimorio_feedback_limits` con l'hash HMAC (salato con il segreto del server) dell'indirizzo; righe cancellate dopo un giorno.
- Migrazione additiva con la procedura del progetto: le due tabelle sono create al primo uso (`CREATE TABLE IF NOT EXISTS`, `lib/feedback.ts`), come statistiche e tentativi di login. Nessuna azione manuale su Neon. `tests/schema-runtime-tables.cjs` verifica che schema.ts e la tabella reale coincidano.

## Antispam
- Campo trappola invisibile «sito»: se compilato la risposta è «ok» ma nulla viene salvato o inviato.
- Tempo minimo 3 s: il modulo riceve un gettone firmato dal server (`GET /api/segnalazioni`), valido da 3 s a 24 h.
- Limite: 5 invii all'ora e 20 al giorno per dispositivo; in più un tetto complessivo di 60 all'ora (protegge anche la quota email).
- Origine controllata (solo pagine del sito), corpo massimo 8 KB, testo ripulito da caratteri di controllo, sempre mostrato come testo.
- Cloudflare Turnstile: supportato ma **non attivo** (TURNSTILE_SITE_KEY e TURNSTILE_SECRET_KEY non presenti su Vercel).

## Email (Resend, solo server)
- Prima si salva, poi si invia (dopo la risposta al visitatore). Se l'invio fallisce la conferma resta; nell'admin compare «Email di avviso non inviata».
- Oggetto `[Grimorio] Errore|Mancanza|Consiglio · <percorso>`: niente testo dell'utente. Corpo in italiano con tipo, riguarda, data e ora, email di risposta, messaggio e link all'amministrazione; Reply-To = email dell'utente se presente.
- Mittente: `FEEDBACK_FROM_EMAIL` se impostata, altrimenti il mittente di prova di Resend `onboarding@resend.dev` (oggi così: la variabile non c'è).
- Senza `RESEND_API_KEY` o `FEEDBACK_TO_EMAIL`: nessun errore, segnalazione salvata, avviso nei log.

## Amministrazione
- Stesso login di `/admin` (`ADMIN_PASSCODE`, `lib/admin-auth.ts`), nessun secondo accesso. Pulsante «Segnalazioni» con il numero di nuove nella pagina admin.
- `/admin/segnalazioni`: «N nuove», filtri tipo e stato, righe dal più recente con pillola, data, pagina, anteprima, «NUOVA».
- `/admin/segnalazioni/<id>`: aprirla la segna come letta; messaggio, «Riguarda» con link, «Rispondi via email» (mailto), Letta · Risolta · Archivia, nota privata, «Elimina segnalazione» con conferma.
- noindex; mai nel service worker (`/admin/*` e `/api/*` vanno sempre in rete).

## Verifiche
- `tests/feedback.cjs`: validazione, trappola, tempo minimo, limiti, pulizia, salvataggio senza IP, email simulata, assenza chiave, stati admin, Turnstile simulato.
- `scripts/check-client-bundle.mjs`: ora fallisce se nel codice del browser compaiono nomi o valori di chiavi, destinatario o `api.resend.com`.
- E2E: invio da una scheda (con edizione), senza email, email non valida, conferma, spam, chiamate dirette rifiutate, admin senza login → login, elenco, filtri, dettaglio, stato, nota, eliminazione; offline del modulo.
