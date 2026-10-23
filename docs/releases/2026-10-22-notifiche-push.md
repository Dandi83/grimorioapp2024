# Notifiche push per l'amministratore — 22 ottobre 2026

Ramo `feat/notifiche-push-20261022`, base `main` a4d7e32 (#65). Non unito: attende l'OK di Daniele.

## Cosa fa
- Una notifica sul telefono dell'amministratore per ogni nuova segnalazione:
  - titolo «Nuova segnalazione»;
  - testo «<Tipo> · <pagina segnalata o "Generale">» e l'inizio del messaggio, massimo 80 caratteri;
  - mai l'email del segnalatore.
- Toccandola si apre `/admin/segnalazioni/<id>`. Con la sessione scaduta compare prima il login, poi la stessa pagina.
- I visitatori non ricevono mai notifiche: possono iscriversi solo i dispositivi dell'amministratore.

## Area riservata
- Home admin: riquadro «Notifiche» (icona Bell) con il numero di dispositivi attivi.
- `/admin/notifiche`:
  - stato del dispositivo, «Attive su questo dispositivo» o «Non attive su questo dispositivo»;
  - «Attiva notifiche su questo dispositivo», che chiede il permesso al sistema;
  - «Invia notifica di prova» a questo dispositivo;
  - «Disattiva su questo dispositivo»;
  - elenco «Dispositivi attivi» (nome come «iPhone · Safari», data di attivazione) con «Rimuovi»;
  - «Cosa ti avvisa»: un interruttore per tipo di notifica; per ora solo «Segnalazioni», attivo di default.
- iPhone fuori dalla schermata Home: al posto del pulsante, 3 passi (Condividi → «Aggiungi alla schermata Home» → apri il Grimorio dall'icona e torna in Notifiche).
- Permesso negato: come riattivarlo (Impostazioni → Notifiche → Grimorio → «Consenti notifiche»).
- Interruttore di emergenza del service worker spento: la pagina lo dice, perché le notifiche passano dal service worker.

## Tecnica
- Web Push standard con la libreria `web-push` 3.6.7 e chiavi VAPID (`lib/push.ts`).
- Chiavi:
  - `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` se ci sono entrambe sul server;
  - altrimenti la coppia viene generata al primo uso e salvata nel database (`grimorio_push_keys`). Due primi usi contemporanei salvano una sola coppia.
- La chiave privata resta sul server. `scripts/check-client-bundle.mjs` ora fallisce se nel codice del browser compaiono il nome o il valore di `VAPID_PRIVATE_KEY` o la libreria che firma (`generateVAPIDKeys`).
- Tabelle nuove, solo aggiunte, create al primo uso:
  - `grimorio_push_keys`;
  - `grimorio_push_subscriptions` (indirizzo del servizio push, chiavi pubbliche del dispositivo, nome, data);
  - `grimorio_push_types` (interruttori; un tipo senza riga usa il suo default).
- Azioni server (`app/actions/admin-push.ts`), tutte con `requireAdmin`: chiave pubblica, iscrizione, rimozione, prova, interruttore del tipo.
- Invio dopo la risposta al visitatore (`after()` in `app/api/segnalazioni/route.ts`), insieme all'email. Se la push fallisce, la segnalazione resta salvata e l'email parte comunque; nei log c'è solo una riga breve, senza chiavi, indirizzi o testi.
- Iscrizioni rifiutate dal servizio push (404 o 410) cancellate da sole.
- Service worker: nuovi eventi «push» (mostra la notifica) e «notificationclick» (apre l'indirizzo in una finestra del Grimorio già aperta, o in una nuova). Si aprono solo indirizzi di questo sito. Il resto del comportamento non cambia, interruttore di emergenza compreso.
- CSP invariata: iscrizione e consegna passano dal browser e dal service worker, non da richieste della pagina verso altri siti.
- Nuovi tipi di avviso: una riga in `NOTIFICATION_TYPES` (`lib/push.ts`) e una chiamata a `sendPush(tipo, …)` dove succede l'evento.

## Verifiche
- `tests/push.cjs`:
  - chiavi da variabili, generate una volta e riusate;
  - azioni solo per l'amministratore;
  - iscrizione e rinnovo, rimozione;
  - invio con servizio push simulato, 404/410 cancellate, altri errori contati;
  - interruttore del tipo, testo senza email, troncatura a 80 caratteri;
  - risposta al visitatore prima della push; push che fallisce con email inviata e segnalazione salvata.
- `tests/service-worker.cjs`: notifica mostrata, indirizzi esterni rifiutati, tocco che apre la pagina.
- `tests/client-bundle-guard.cjs`: chiave privata e libreria fuori dal codice del browser.
- `tests/schema-runtime-tables.cjs`.
- Prova nel browser: riquadro, iPhone in Safari (3 passi), computer (pulsante), permesso negato, interruttore salvato, 360/375/390 px. `/admin/notifiche` senza login mostra solo l'accesso.
- Non verificabile qui: la consegna reale tramite i servizi push di Apple e Google, che richiede un dispositivo vero.
