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
- `frontend/` e `backend/` sono prototipi storici Expo/FastAPI, esclusi dalla build ufficiale. Non avviare i loro script pensando che siano il backend attuale.
- Test e build possono girare senza collegare il database di produzione. Le pagine dinamiche in esecuzione richiedono invece un database dedicato di sviluppo con schema e dati di prova. Se manca, dichiaralo: una build riuscita non prova il funzionamento runtime del catalogo.
- Non eseguire `scripts/seed.mjs`, migrazioni o script `fill-*` contro database reali. Le vecchie fixture non rappresentano necessariamente tutti i record presenti oggi.
- Non copiare credenziali di Vercel/Neon/Apple/PostHog in file o output. Nessun segreto privato nell'app mobile.
- Esegui i test pertinenti ai cambiamenti e la build quando necessaria. Non dichiarare verificati simulatore, iPhone, firma o TestFlight se non effettivamente eseguiti.

## Vincoli funzionali da preservare

- Grafica nera e oro, intestazione `Il Grimorio.App` con `.App` oro; navigazione inferiore Home, Incantesimi, Bestiario, Preferiti.
- Negli elenchi pubblici e preferiti niente etichette edizione. Solo nelle schede: icona libro e `D&D5e 2024` oppure `D&D5e 2014`. Conserva metadati edizione e scelta amministrativa.
- Incantesimi, mostri e animali condivisibili tramite link pubblici alle singole schede.
- Non sostituire o cancellare modifiche amministrative successive con le fixture SRD. Mantieni verifica delle fonti, attribuzioni, varianti 2014 e separazione tra edizione e licenza.
- Statistiche con consenso facoltativo; test e amministratori esclusi. Visitatori unici indicano browser/installazioni riconosciute, non persone certificate. Letture e condivisioni sono indicatori con limiti espliciti.
- Preferiti del browser non si trasferiscono automaticamente nell'app iOS. Offline e Universal Links non sono ancora implementati.

## Comunicazione

Comunica in italiano, con aggiornamenti brevi e concreti. Distingui stato verificato, ipotesi e lavoro mancante. Daniele vuole continuità da iPhone anche con il Mac spento: non proporre una sessione sul Mac come equivalente a Codex Cloud. La compilazione/firma iOS richiede un ambiente macOS appropriato; non prometterla da un semplice ambiente Linux.
