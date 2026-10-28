# Il Grimorio.App — istruzioni per Codex

Leggi prima `docs/continuita-progetto.md` e `docs/verifica-ios-2026-10-18.md`. Sono il passaggio di contesto verificato per questo progetto; non implicano che tutta la cronologia ChatGPT sia stata trasferita.

## Repository e punto di partenza

- Repository: `Dandi83/grimorioapp2024`. Non creare repository duplicati.
- La produzione verificata il 18 ottobre 2026 è il commit `0dcb9f338255d2a7ef63e40fdf0b95e17abd7c15`, branch `ui/detail-only-edition-badges-20261018`, dominio `https://ilgrimorio.app`.
- Il rapporto iOS è nel discendente `8327e5984b3646190af342fab51af91c8a8493a4`.
- Il branch di preparazione cloud è `cloud/grimorio-ios-20261018`. Usalo per il setup; per ogni nuova attività crea un branch di lavoro da questo stato o dal successivo stato verificato. `main` era arretrato al momento del passaggio: non usarlo come base senza confronto.
- Prima di modificare o pubblicare il sito in futuro, verifica il commit effettivamente in produzione; altri lavori possono averlo aggiornato.

## Ambito della preparazione cloud

La richiesta attuale autorizza ambiente cloud, continuità del progetto e preparazione della prova iPhone. Non autorizza acquisti, invii ad App Store, modifiche ai dati reali o deploy in produzione per la versione mobile. Non attivare servizi a pagamento o consumare crediti Higgsfield senza OK esplicito.

Mantieni sito, catalogo e area amministrativa esistenti. Non mescolare con AGAIN, THE HOUSE, JARVIS o altri progetti. Lavoro mobile in branch separati. La scelta Capacitor è una raccomandazione da validare con una prova, non una build iOS già riuscita.

## Coordinamento permanente web / iPhone

Regola esplicita di Daniele del 18 ottobre 2026: evitare sovrapposizioni tra questa chat web e la chat `IL GRIMORIO — iPhone · Codex Cloud`.

- Chat web: sito pubblico, catalogo, amministrazione e statistiche. Chat Codex iPhone: client mobile/Capacitor su branch separati.
- Prima di ogni intervento verifica stato del repository, branch remoti, commit di produzione e lavoro dell'altro filone disponibile nei documenti e nelle chat. Non presumere una sincronizzazione automatica delle conversazioni.
- Non modificare contemporaneamente gli stessi file condivisi nei due filoni. Se esiste lavoro concorrente, prosegui su parti indipendenti e coordina la modifica condivisa prima di applicarla.
- Distingui nei documenti l'ultimo commit web pubblicato dalla base mobile. Registra branch, commit, file condivisi cambiati e verifiche nei passaggi significativi.
- Trasferisci le modifiche condivise con integrazione esplicita e verificata; niente merge automatici dell'intero lavoro iPhone nel sito o aggiornamenti ciechi della base mobile.
- La pubblicazione del sito e quella dell'app iPhone sono operazioni distinte, con le rispettive autorizzazioni. Le richieste successive di Daniele possono ridefinire questa divisione.

## Ambiente e verifiche

- La root è la web app Next.js attuale. Usa Node.js 24 LTS (22 LTS è accettabile se compatibile con lockfile e build), npm e il `package-lock.json` della root.
- Setup riproducibile: `bash scripts/setup-codex-cloud.sh`.
- Comandi: `npm ci`, `npm test`, `npm run build`, `npm run dev`.
- I prototipi storici Expo/FastAPI (`frontend/`, `backend/`), `uploads/` e l'archivio delle illustrazioni dei mostri sono stati rimossi il 19 ottobre 2026 su decisione di Daniele (vedi `docs/releases/2026-10-19-pulizia-totale.md`). Non ripristinarli.
- Test e build possono girare senza collegare il database di produzione. Le pagine dinamiche in esecuzione richiedono invece un database dedicato di sviluppo con schema e dati di prova. Se manca, dichiaralo: una build riuscita non prova il funzionamento runtime del catalogo.
- Non eseguire `scripts/seed.mjs`, migrazioni o script `fill-*` contro database reali. Le vecchie fixture non rappresentano necessariamente tutti i record presenti oggi.
- Non copiare credenziali di Vercel/Neon/Apple/PostHog in file o output. Nessun segreto privato nell'app mobile.
- Esegui i test pertinenti ai cambiamenti e la build quando necessaria. Non dichiarare verificati simulatore, iPhone, firma o TestFlight se non effettivamente eseguiti.

## Vincoli funzionali da preservare

- Prestazioni immagini: Daniele ha segnalato caricamento più lento e scattoso su iPhone dopo l'attivazione AVIF del commit `d4d9db9`. L'esperimento è stato ritirato ripubblicando `9613809`, con WebP predefinito, foto e crediti conservati. Non ripristinare AVIF sulla sola base dei KB o del controllo visivo desktop: serve validare prima la fluidità sul dispositivo/rete interessati. Dettagli in `docs/releases/2026-10-18-prestazioni-immagini.md`, sezione regressione.

- Grafica: tema chiaro unico scelto da Daniele il 20 ottobre 2026 (sfondo pergamena #F6EFDF, testo #2B2118, bordeaux #7A1F2B, ambra #E0A21A; EB Garamond per i titoli, Source Sans 3 per il testo); intestazione `Il Grimorio.App` con `.App` in evidenza; navigazione inferiore Home, Incantesimi, Bestiario, Preferiti. Sostituisce la precedente grafica nera e oro.
- Negli elenchi pubblici e preferiti niente etichette edizione. Solo nelle schede: etichetta scura con icona libro e anno (`2024` oppure `2014`), con «D&D5e» e la fonte nel testo accessibile. Conserva metadati edizione e scelta amministrativa.
- Incantesimi, mostri e animali condivisibili tramite link pubblici alle singole schede.
- Non sostituire o cancellare modifiche amministrative successive con le fixture SRD. Mantieni verifica delle fonti, attribuzioni, varianti 2014 e separazione tra edizione e licenza.
- Statistiche contate per tutti dalla prima pagina tranne chi rinuncia («No» sulla barra o interruttore in /privacy), dal 28 ottobre 2026 su decisione di Daniele: solo prima parte, aggregate, niente IP né user agent completo, niente invio a terzi (PostHog rimosso), cookie visitatore ≤ 13 mesi; test e amministratori esclusi. Visitatori unici indicano browser/installazioni riconosciute, non persone certificate. Letture e condivisioni sono indicatori con limiti espliciti.
- Home (28 ottobre 2026, canvas «Valutazione Il Grimorio.App»): card «Porta il Grimorio al tavolo» sempre nel flusso della pagina (condivide `https://ilgrimorio.app/?da=amico`, il segno si toglie dall'indirizzo appena letto); domanda «Come ti trovi con il Grimorio?» con tre faccine SVG solo dalla 3ª visita in giorni diversi, mai con la barra delle statistiche o l'invito «Aggiungi a Home», mai a chi ha detto «No» o ai dispositivi admin, pausa di 4 mesi dopo risposta o ×. Voti nella tabella `grimorio_ratings` (solo voto, data, tipo di dispositivo; chiave anti-doppio cifrata svuotata dopo 4 mesi); risultati e «Passaparola» in `/admin/statistiche/valutazione`.
- «Sostieni il Grimorio» (28 ottobre 2026, canvas omonimo): link Ko-fi nella costante `SUPPORT_URL` di lib/support.ts; finché è vuota link (Home, /info, colonna laterale), pagina /sostieni (404) e card occasionale non esistono. Il contributo non sblocca nulla e il sito non gestisce pagamenti. Card dalla 5ª visita, pausa 2 mesi, mai con valutazione, barra statistiche o invito; mai ai dispositivi admin. Nei test e2e l'indirizzo finto arriva solo da `GRIMORIO_SUPPORT_URL_PROVA` (e2e/run.mjs).
- Limiti antispam (28 ottobre 2026, in attesa di Turnstile): statistiche con limite per indirizzo (hash giornaliero), visitatori nuovi per indirizzo all'ora e tetto globale al minuto, eventi in più scartati in silenzio (`ANALYTICS_LIMITS` in lib/analytics.ts); segnalazioni e proposte oltre il tetto globale salvate con `picco` senza email né push; avvisi al massimo 10 all'ora per tipo, poi un solo avviso riassuntivo (lib/notice-limit.ts). Ogni nuova pagina pubblica va in `ANALYTICS_PATH` (controllo in tests/analytics-pages.cjs).
- Preferiti del browser non si trasferiscono automaticamente nell'app iOS. Il sito web ha un service worker (`app/sw.js/route.ts`, `lib/sw/service-worker.js`) che rende disponibili offline le pagine pubbliche già aperte, con avviso «copia salvata»; interruttore di emergenza `GRIMORIO_SERVICE_WORKER=off` su Vercel. Riguarda solo il sito nel browser: l'app iOS non ha ancora offline né Universal Links.

## Comunicazione

### Report finale (regola fissa di Daniele, 20 ottobre 2026)

Per ogni richiesta, a lavoro finito, scrivi UN SOLO messaggio finale di report, come unico blocco di testo da copiare, con questa struttura e niente altro:

```
REPORT FINALE
1) Richiesta: in una riga, cosa è stato chiesto.
2) Stato: pronto da provare / in attesa di ok / bloccato (e perché).
3) Link: anteprima Vercel e pull request (sempre, in cima, anche se già inviati prima).
4) Cosa ho fatto: elenco breve dei punti, con i file principali.
5) Verifiche: esito di ogni controllo (tipi, test, build, prove nel browser) e se qualcosa è fallito o instabile.
6) Differenze o sorprese: cose inattese, dati discordanti, scelte fatte in autonomia.
7) Da approvare: elenco numerato di tutto ciò che aspetta l'ok (abbinamenti, merge, scelte), con tutti i dettagli per decidere, senza rimandare a messaggi precedenti.
8) Da provare su iPhone: 2-4 punti precisi, con gli indirizzi esatti da aprire.
9) Rischi e cosa NON è stato verificato.
10) Prossimo passo proposto.
```

Niente messaggi intermedi con pezzi di report. Italiano semplice, completo e comprensibile anche senza aver letto la conversazione. Se la richiesta ha più passaggi, il report arriva alla fine di ognuno.


Comunica in italiano, con aggiornamenti brevi e concreti. Distingui stato verificato, ipotesi e lavoro mancante. Daniele vuole continuità da iPhone anche con il Mac spento: non proporre una sessione sul Mac come equivalente a Codex Cloud. La compilazione/firma iOS richiede un ambiente macOS appropriato; non prometterla da un semplice ambiente Linux.
