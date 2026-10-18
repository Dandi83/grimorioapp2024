# Il Grimorio.App — verifica tecnica per iPhone

Data: 18 ottobre 2026. Codice esaminato: `0dcb9f338255d2a7ef63e40fdf0b95e17abd7c15`, pubblicato su https://ilgrimorio.app. Questa è una verifica del codice, delle risposte pubbliche e dei percorsi principali: non è una certificazione di sicurezza, delle licenze o dell'approvazione Apple. Nessuna build iOS è stata prodotta o provata in questa verifica.

## Esito

Il progetto può diventare un'app iPhone mantenendo il sito e il database esistenti. Non è già un'app pronta per lo Store. La strada consigliata è una versione React con Capacitor, interfaccia e catalogo inclusi nell'app, dati aggiornabili dal servizio esistente e salvataggi locali. La scelta va confermata da una breve prova su iPhone prima di impegnarsi nell'intero sviluppo.

Il primo rilascio dovrebbe comprendere Home, Incantesimi, Bestiario con animali, Preferiti, schede, ricerca e filtri offline, condivisione, fonti e privacy. Area amministrativa sul web. Account, pagamenti, sincronizzazione tra dispositivi e nuove funzioni personaggi esclusi dalla stima iniziale.

## Cosa esiste e cosa manca

| Area | Evidenza attuale | Intervento per iPhone |
| --- | --- | --- |
| Applicazione ufficiale | Next.js 16.3.4, React 19.1.1, TypeScript, Tailwind; root pubblicata da Vercel | Riutilizzare stile e logica client; separare il client mobile dalle funzioni server |
| Catalogo | 389 incantesimi, 241 mostri e 100 animali rilevati sul sito | Snapshot completo e versionato con stessi ID, fonti, classificazioni ed edizioni |
| Accesso ai dati | `lib/spells.ts` e `lib/monsters.ts` leggono Postgres sul server; pagine dinamiche | Endpoint pubblici di sola lettura per catalogo e versione, senza credenziali DB nel telefono |
| Offline | Manifest e istruzioni Aggiungi a Home presenti; nessun service worker o archivio offline individuato | Catalogo iniziale incluso, archivio locale, aggiornamento atomico con conservazione dell'ultima copia valida |
| Preferiti | `grimorio.favorites.v1` in localStorage; ID distinti per creature | Archivio locale adatto all'app; nessuna sincronizzazione automatica col browser o tra dispositivi |
| Condivisione | Link HTTPS alle schede, Web Share e copia, provenienza `ref=share` | Condivisione del sistema e Universal Links; associazione sito-app e gestione avvio a freddo |
| Statistiche | Consenso esplicito, identificativo firmato in cookie, endpoint stessa origine, esportazione server verso PostHog UE | Adattare consenso, identificazione e invio per l'origine dell'app; accodamento offline, deduplica, revoca |
| Amministrazione | Passcode, cookie HttpOnly/Secure e controllo sulle azioni server | Mantenere separata sul web; niente segreti amministrativi nell'app pubblica |
| Preparazione Apple | Nessun progetto iOS attuale configurato per questa versione, associazione dominio assente | Identificatore definitivo, firma, icona, schermata iniziale, privacy manifest secondo API/SDK usati, scheda Store e supporto |

### Dipendenze dal server

Non basta attivare l'esportazione statica del progetto attuale: usa letture DB, cookie, Server Actions e pagine dinamiche. La documentazione Next.js elenca limitazioni delle esportazioni statiche per queste funzionalità. L'area amministrativa e gli endpoint devono rimanere sul server; la consultazione mobile deve poter leggere un catalogo locale.

Per gli aggiornamenti propongo manifest con versione, checksum e URL del catalogo. Il telefono scarica e valida la nuova copia, poi la sostituisce in un'unica operazione; un aggiornamento interrotto non deve distruggere il catalogo precedente. Le modifiche amministrative diventano disponibili al successivo aggiornamento online, non immediatamente su un telefono disconnesso. Le fonti e le attribuzioni devono accompagnare anche la copia offline.

### Preferiti e link

I preferiti del sito appartengono al browser attuale. Un contenitore iOS ha il proprio archivio: non bisogna promettere che compaiano automaticamente. Per la versione iniziale usare preferiti locali; un'importazione esplicita può essere valutata a parte. Nessun account necessario per la consultazione.

Il file `/.well-known/apple-app-site-association` restituisce oggi 404. Sono da configurare Associated Domains, associazione con Team ID/Bundle ID e instradamento dei link verso la stessa scheda. Se l'app non è installata, il sito rimane la destinazione.

### Statistiche e privacy

Il sistema attuale è progettato per richieste dalla stessa origine HTTPS e cookie del sito: non si può copiarlo invariato nel client locale. Definire un canale mobile con eventi e identificativi separabili, validazione, limiti di invio e nessuna credenziale privata nel pacchetto. Le letture offline devono essere datate al momento dell'uso, inviate dopo il consenso, cancellate dalla coda alla revoca e deduplicate al ritorno online. Considerare lo stato attivo/inattivo dell'app per la lettura stimata.

La pagina privacy esiste, ma prima dello Store servono le informazioni del responsabile del servizio e un contatto reale per assistenza e richieste sui dati. Compilare App Privacy in base alla raccolta effettiva e ai fornitori; la sola assenza di nomi/email non equivale ad assenza di dati raccolti. Non è stata verificata in questa attività la configurazione completa dei fornitori o un requisito ATT per una futura versione.

## Prototipo Expo esistente

Il repository contiene una vecchia applicazione Expo/React Native in `frontend/` e una API FastAPI/MongoDB in `backend/`, escluse dalla build Next.js. Non costituiscono la versione mobile del sito attuale:

- Il client chiama `EXPO_PUBLIC_BACKEND_URL` e vecchi endpoint `/api/spells`; questo endpoint sul sito ufficiale restituisce 404.
- Nelle route del prototipo non sono presenti le nuove schermate mostri/animali.
- Nome, schema e Bundle ID sono ancora generici del vecchio ambiente.
- I controlli della web app non compilano né validano quel prototipo.

Può offrire riferimenti di navigazione e componenti, ma non lo considererei una scorciatoia pronta al rilascio. Non sono stati installati i suoi pacchetti né testato il vecchio backend.

## Confronto dei percorsi

| Percorso | Vantaggio | Lavoro e limite | Giudizio |
| --- | --- | --- | --- |
| React con Capacitor, interfaccia inclusa | Conserva più direttamente aspetto e componenti DOM attuali; accesso alle funzioni iOS | Estrarre client e dati dal server; implementare offline, storage e integrazioni | Prima scelta da provare |
| React Native/Expo aggiornato | Componenti e navigazione nativi; possibile percorso Android successivo | Porting consistente dell'interfaccia HTML/Tailwind e del rendering dei testi; vecchio client incompleto | Alternativa se la prova Capacitor non soddisfa |
| SwiftUI | Integrazione Apple diretta | Ricostruzione dell'interfaccia e maggiore separazione dalla web app | Poco conveniente per il primo rilascio di questo progetto |

La documentazione Capacitor descrive `server.url` come opzione per live reload, non destinata alla produzione. La proposta usa quindi risorse incluse nell'app e API remote per i dati. Nessuna percentuale di codice riutilizzato viene assegnata senza un porting reale.

## Materiali da verificare prima della distribuzione

La pagina `/fonti` distingue testi SRD da sintesi originali e attribuisce le icone dei danni a Baldur's Gate 3/Larian. L'attribuzione, da sola, non documenta un'autorizzazione alla distribuzione di quelle immagini. Per il rilascio propongo di sostituire le 13 icone con un set originale o con licenza documentata. Non sono state modificate in questa attività.

Occorre inoltre registrare provenienza e condizioni d'uso di immagini hero, logo, schermate e dei materiali delle schede personaggio se inclusi. Le descrizioni originali fuori SRD richiedono una verifica distinta: l'etichetta dell'edizione non certifica una licenza. Il disclaimer fan-made non sostituisce questa verifica. Apple può richiedere documentazione sui diritti dei materiali di terzi.

Sono da aggiornare anche il nome obsoleto in manifest/metadati e la frase del messaggio iOS «anche offline», attualmente non sostenuta da un'implementazione offline. Questi rilievi dell'audit non sono stati applicati al sito.

## Prestazioni e affidabilità

Le risposte HTML rilevate sono circa 1,35 MB per gli incantesimi e 1,34 MB per i mostri, prima di considerarne la compressione di trasporto. Non sono misure di consumo effettivo su iPhone né tempi di caricamento: indicano che oggi liste e dati vengono serializzati insieme. Nel client mobile separare indice e contenuto dettagliato, misurare avvio, ricerca e scorrimento su un dispositivo reale e usare liste efficienti se necessario.

Le risorse `public/` occupano circa 7,9 MB e i file di riferimento `lib/data/` circa 3,1 MB nel repository: non sono una stima del pacchetto iOS. Non includono automaticamente lo stato corrente del database.

Il login amministrativo usa passcode condivisa e non presenta limitazione dei tentativi nel codice dell'azione esaminata. Non è stato verificato un eventuale limite a livello di piattaforma. Per una distribuzione più ampia, verificare protezione dagli abusi e gestione accessi sul web. Nessuna prova intrusiva sul servizio è stata eseguita.

## Prova tecnica e criteri di avanzamento

Prima fase proposta: 2–3 giornate di lavoro per una build iPhone rappresentativa con Home, ricerca, una scheda incantesimo, una creatura, archivio locale e condivisione. Non avviata nell'audit.

Si prosegue solo dopo aver verificato su iPhone: avvio dopo chiusura completa senza rete, ricerca e apertura di schede mai visitate, persistenza preferiti, assenza di perdita dati durante aggiornamento interrotto, apertura di un link condiviso sia ad app chiusa sia aperta, corretta visualizzazione di tabelle e testi, consenso statistiche rispettato.

Successivamente: catalogo completo e integrazioni; prove iPhone/iPad e accessibilità; TestFlight con piccoli gruppi; correzioni; materiali Store e invio. Offline e integrazioni migliorano l'utilità ma non garantiscono l'approvazione: Apple valuta l'app completa e richiede valore oltre un sito riconfezionato.

## Stima e costi

Stima di lavoro, non preventivo né promessa di calendario: 15–25 giornate effettive per una prima versione limitata, includendo prova tecnica, dati/offline, adattamento interfaccia, integrazioni e QA. Con beta di 1–2 settimane parzialmente sovrapposta e preparazione Store, un ordine di grandezza prudente è 4–7 settimane; attese account, diritti sui materiali, revisioni Apple e ampliamenti di scope possono allungarlo. Il vecchio intervallo 4–6 settimane rimane plausibile solo con scope stretto e senza blocchi emersi dalla prova.

Apple Developer Program: 99 USD per anno o prezzo locale previsto, da verificare al momento dell'iscrizione. Build su Mac con Xcode o servizio cloud da configurare: nessun servizio a pagamento è stato attivato e non è stato stimato un costo cloud senza conoscere piano e utilizzo. Hosting e database esistenti restano, con costo dipendente dal traffico. In questa verifica nessun acquisto, abbonamento o generazione di immagini è stato eseguito.

## Verifiche eseguite e limiti

- Suite completa `npm test` e `npm run build`: riuscite dopo la modifica delle etichette.
- Sul dominio ufficiale: 389 righe incantesimi, 241 mostri e 100 animali senza etichette edizione nelle righe.
- Dettagli Colpo Accurato, Cespuglio risvegliato e Aquila: edizione 2024 e icona libro presenti. Sciame di ragni: edizione 2014 e icona libro presenti.
- Vercel READY, produzione assegnata a `ilgrimorio.app`, commit `0dcb9f3`.
- `/manifest.webmanifest`: 200. `/api/spells` e file associazione Apple: 404. Statistiche amministrative senza sessione: arrivo alla pagina di accesso.
- Lettura dei componenti di ricerca, preferiti, condivisione, dati, amministrazione, statistiche e dei file del prototipo Expo.
- Nessuna build Xcode, firma, simulatore, test iPhone fisico, prova runtime offline, audit completo delle dipendenze o approvazione delle licenze. La raccomandazione architetturale è un'inferenza dalle evidenze, da validare con la prova proposta.

## Documentazione di riferimento

- Next.js, esportazioni statiche e limitazioni: https://nextjs.org/docs/app/guides/static-exports
- Capacitor, installazione e risorse web incluse: https://capacitorjs.com/docs/getting-started
- Capacitor, configurazione e limiti di `server.url`: https://capacitorjs.com/docs/config
- Capacitor, Universal Links: https://capacitorjs.com/docs/guides/deep-links
- Apple, linee guida 4.2, 5.1 e 5.2: https://developer.apple.com/app-store/review/guidelines/
- Apple, dichiarazioni privacy: https://developer.apple.com/app-store/app-privacy-details/
- Apple, programma sviluppatori: https://developer.apple.com/help/account/membership/program-enrollment/
- Apple, TestFlight: https://developer.apple.com/testflight/
- Expo, compilazione e invio iOS: https://docs.expo.dev/submit/ios/
