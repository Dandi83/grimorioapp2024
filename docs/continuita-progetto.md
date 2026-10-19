# Il Grimorio.App — continuità del progetto

Primo accesso senza skeleton, solo preview del 19 ottobre: codice `8254fc8`, branch `perf/lista-incantesimi`, deployment `dpl_7eX6kb3gNRC3ZmBM4B478V4wrwHH` READY. Rimosse Suspense/useSearchParams delle liste e le quattro boundary loading; HTML statico con nomi reali, filtri applicati via useEffect, prefetch idle/touch/hover. Pregenerate 389 schede incantesimo e 342 creature (743 pagine totali), dynamicParams=true. tsc, performance, suite e npm run build Vercel riusciti; build 39 s contro 9 s, un worker, nessun errore connessioni. Produzione invariata a 59c5ffb, nessun merge/mobile. Registro: `docs/releases/2026-10-19-primo-accesso-senza-skeleton.md`.

Anteprima prestazioni del 19 ottobre: codice `794f55b`, branch `perf/lista-incantesimi`, deployment `dpl_HAaKMhEhPMy4ovScJscmsWysnXBR` READY. Router Cache a 300 s; elenchi statici e schede ISR a 300 s; prefetch completo della barra, automatico disattivato nelle righe; invalidazione scheda anche alla cancellazione creatura. tsc, test:catalog-performance, npm test e build Vercel riusciti. Regioni Vercel iad1 / Neon us-east-1 allineate. Solo preview, nessun merge o aggiornamento mobile. Produzione ricontrollata invariata a 59c5ffb. Dettagli e limiti in `docs/releases/2026-10-19-cache-navigazione-preview.md`.

Ultimo rilascio web verificato il 19 ottobre: `59c5ffbd59e4ab8feec702ce6a9a227cc66c118b`, branch `fix/catalog-fluidity-20261019`, deployment `dpl_Hf6MBCyxEghp1U1bEUe7Hg93kPRp`, READY con alias ufficiali. Interventi sulle tre criticità di fluidità, nessuna foto delle creature riattivata. Verifica iPhone ancora da eseguire. Rollback `dc36bd67` / `dpl_G3Up3AxBDSjnZ3CxxhEBh4ZYdA2M`.

Intervento web del 19 ottobre sulla fluidità, branch `fix/catalog-fluidity-20261019`: deduplicazione letture schede nella singola richiesta, rendering differito delle righe fuori schermo, barre/pulsanti senza sfocatura e segnaposto delle schede più coerenti. Suite completa, test RSC reale, test DOM e build locali riusciti. Le righe restano tutte nel DOM; nessun benchmark iPhone eseguito. Dettagli e limiti in `docs/releases/2026-10-19-fluidita-catalogo.md`. Verificare il commit effettivamente pubblicato tramite Vercel prima di proseguire. Il branch mobile rimane separato a `e22f06e`; nessuna integrazione automatica.

Aggiornamento: 18 ottobre 2026. Questo documento raccoglie decisioni e stato verificabile dal codice e dalla conversazione di lavoro. Non è un'esportazione completa di tutte le chat, né un'autorizzazione a pubblicare nuove funzioni.

## Obiettivo e priorità

Daniele sta costruendo un compagno di consultazione per D&D in italiano: incantesimi, bestiario diviso in mostri/animali, schede leggibili, ricerca rapida e preferiti. La qualità grafica è importante, insieme alla comodità durante le sessioni. Il nome scelto è **Il Grimorio.App** e il dominio ufficiale è https://ilgrimorio.app.

La nuova fase è valutare e preparare la versione iPhone con Capacitor, continuando da Codex Cloud tramite l'app ChatGPT anche quando il Mac è spento. Non creare una nuova applicazione web concorrente o un repository duplicato. Il sito ufficiale resta il riferimento per catalogo e gestione amministrativa.

## Identificatori e sorgenti

- GitHub: https://github.com/Dandi83/grimorioapp2024.
- Root: applicazione Next.js 16.3.4 / React 19 / TypeScript / Tailwind, Postgres con Drizzle.
- `frontend/`: vecchio prototipo Expo/React Native. `backend/`: vecchio prototipo FastAPI/MongoDB. Non sono la versione ufficiale attuale.
- Vercel progetto `grimorioapp2024`, ID `prj_PjDCPQlG4DMh9p2ZIlBTppZMSGMq`, team `team_2wnC0kx2WC2ryPk53cerZRsn`.
- Produzione verificata: commit `0dcb9f338255d2a7ef63e40fdf0b95e17abd7c15`, branch `ui/detail-only-edition-badges-20261018`, deployment `dpl_3tsq1WXtTe8X4Fh64H8CfDgqyKDg`.
- Report iOS: commit `8327e5984b3646190af342fab51af91c8a8493a4`, branch `docs/ios-readiness-20261018`.
- Branch di preparazione ambiente: `cloud/grimorio-ios-20261018`, discendente dei precedenti. La produzione non include automaticamente i successivi documenti di setup.
- `main` era arretrato; controllare branch e cronologia prima di iniziare.
- Anche https://grimorioapp2024.vercel.app serve la produzione; `www.ilgrimorio.app` rimanda al dominio principale.

Questi ID identificano risorse, non contengono credenziali. I segreti rimangono nei rispettivi servizi; l'autorizzazione di un connettore in questa chat non si trasferisce automaticamente a una nuova attività.

## Decisioni di interfaccia approvate e già pubblicate

1. Home con grande immagine biblioteca, colori nero/oro, titolo **Il Grimorio.App**, `.App` oro. Niente collegamenti duplicati alle sezioni nel corpo della Home.
2. Area riservata e termini/informazioni nell'angolo superiore destro; spaziatura compatta. Logo più grande; linea gialla decorativa rimossa; barra inferiore ingrandita con area sicura iPhone.
3. Navigazione inferiore: Home, Incantesimi, Bestiario, Preferiti.
4. Disclaimer fan-made, fonti e licenze raccolti in `/fonti`; privacy e preferenze statistiche in `/privacy`.
5. Bestiario con due raccolte, Mostri e Animali, ricerca e filtri.
6. Ultima richiesta applicata: **nessuna etichetta edizione nelle liste**, compresi i preferiti. Le schede aperte conservano icona libro e **D&D5e 2024** o **D&D5e 2014**, senza testo SRD nel bollino visibile. Fonti disponibili nelle attribuzioni.
7. Edizione modificabile nell'area amministrativa tramite menu a tendina per incantesimi e creature, sia negli editor sia nei controlli dedicati. Una fonte esatta verificata non può essere contraddetta da una semplice etichetta senza modificare i contenuti.
8. Nell'area riservata è presente **Torna al sito**.
9. Ogni scheda incantesimo, mostro e animale ha il pulsante condivisione accanto ai preferiti; menu del dispositivo, copia negli appunti e alternativa manuale. URL canonico su ilgrimorio.app con `ref=share`.

## Catalogo, fonti e altre sezioni

Al controllo pubblico del 18 ottobre: **389 incantesimi, 341 creature: 241 mostri e 100 animali**. Molte fixture e test rappresentano 340 creature. Non eliminare il record aggiuntivo in produzione per far combaciare le fixture.

Sono presenti trascrizioni e riferimenti SRD italiano 5.2.1, aggiunte e varianti SRD 5.1 del 2014, e sintesi originali di regole fuori SRD distinte esplicitamente dalle trascrizioni. Gli import applicano salvaguardie per conservare modifiche amministrative successive. Le edizioni non costituiscono una certificazione delle licenze.

Esistono anche manuale/condizioni con rimandi, dadi e lavoro su schede personaggio descritto in `docs/releases/` e `docs/superpowers/`. La sessione personaggi attuale usa stato client; non promettere persistenza cloud o account funzionanti. Queste sezioni non sono automaticamente incluse nell'MVP iPhone proposto. Leggere i relativi documenti se l'utente chiede di continuarle.

## Statistiche già operative

- Pagina privata: https://ilgrimorio.app/admin/statistiche, protetta dalla sessione amministrativa.
- Dashboard PostHog UE: https://eu.posthog.com/project/295280/dashboard/1034015, **Il Grimorio — Statistiche**.
- Progetto PostHog riutilizzato: `295280`, nome originario Default project; conteneva AGAIN. La creazione di un secondo progetto aveva restituito limite del piano. Nessun upgrade acquistato.
- Gli eventi Grimorio usano prefisso `grimorio_`, proprietà `app=il_grimorio`, identificativi separati e filtro `is_test=false` nei grafici reali.
- Visitatori unici per periodo, aperture per scheda, letture stimate, utenti che premono Condividi, copie/esiti/annullamenti e arrivi da link condivisi.
- Lettura stimata: almeno 20 secondi attivi e almeno 50% della scheda visualizzato; non prova di lettura effettiva. Condivisione non certifica consegna a un destinatario.
- Consenso esplicito e revocabile, nessuna cattura prima dell'accettazione; amministratori e test esclusi. Identificativo casuale del browser, non una persona certificata.
- Eventi conservati in Postgres e inviati dal server a PostHog EU tramite outbox con claim atomico e UUID stabile; retry senza duplicazione verificato. Nessun replay o autocapture.
- Copia operativa eventi: 90 giorni. Consenso/identificativo in cookie: fino a 180 giorni. Conservazione PostHog distinta dal limite locale.
- L'utente ha confermato che le statistiche sono visibili dall'area riservata e poi anche dall'app che usa per PostHog.
- Grimorio è l'unica dashboard fissata. AGAIN (`1010595`) e starter (`999904`) sono stati tolti dai preferiti. Lo storico è conservato; **la rimozione dai preferiti non equivale a disattivare l'invio eventi dell'app AGAIN**, che non è stato verificato né rimosso qui.

File principali: `lib/analytics*.ts`, `components/analytics-provider.tsx`, `app/api/analytics/`, `app/admin/statistiche/`, `components/share-button.tsx`. I nomi di configurazione sul server sono `DATABASE_URL`, `ADMIN_PASSCODE`, `POSTHOG_PROJECT_TOKEN`, `POSTHOG_INGEST_HOST`, `CRON_SECRET`; non copiarne valori nel repository o nell'app iPhone.

## Monetizzazione: decisione e ipotesi

Daniele concorda sul validare prima l'uso con amici e gruppi di gioco, mantenendo la consultazione di base gratuita. Sono state discusse come possibili funzioni Premium grimori personali, organizzazione campagne, note e sincronizzazione. **Non sono funzioni già approvate per implementazione né già esistenti.**

Prezzo ipotizzato da testare: 14,99–19,99 euro/anno, non validato. Nessun abbonamento, pagamento o pubblicità implementati. Prima misurare ritorno settimanale, uso nelle sessioni e disponibilità reale a pagare. Non presentare scenari di ricavo come previsioni.

## iPhone: esito della verifica e prossima fase

Leggere integralmente `docs/verifica-ios-2026-10-18.md`. Raccomandazione: client React con Capacitor e risorse incluse nell'app; server e amministrazione restano sul web. Serve separare l'accesso ai dati dal rendering Next.js, creare catalogo locale versionato, aggiornamenti atomici, preferiti persistenti, Universal Links e condivisione del dispositivo. Non usare semplicemente `server.url` per caricare il sito come soluzione finale.

Offline **non implementato** oggi: manifest e Aggiungi a Home non bastano. Il messaggio iOS attuale contiene «anche offline»: rilievo da correggere, non corretto durante l'audit. Metadati/manifest riportano ancora il vecchio nome GrimorioApp in alcuni punti.

Statistica attuale basata su stessa origine e cookie: da adattare al client locale e all'eventuale invio differito. Preferiti Safari non si trasferiscono automaticamente nell'archivio dell'app.

Rilievo concreto sui materiali: le 13 icone dei danni sono attribuite a Baldur's Gate 3/Larian; manca una documentazione di licenza verificata nell'audit. Proposta: sostituirle con set originale o licenza esplicita prima dello Store. Verificare anche hero, logo e materiali personaggi se inclusi. Il disclaimer fan-made non sostituisce i diritti sui materiali. Nessuna generazione grafica a pagamento autorizzata.

Prova suggerita: Home, ricerca, una scheda incantesimo e una creatura, preferito persistente e condivisione su iPhone; verificare avvio completamente offline e aggiornamento interrotto. Nessuna build iOS, firma, simulatore o prova su dispositivo fisico è stata ancora eseguita.

Stima orientativa: 15–25 giornate di lavoro per scope ristretto; circa 4–7 settimane con beta e preparazione Store, subordinate alla prova e senza garantire la revisione Apple. TestFlight viene **dopo** aver costruito una vera build iOS, non converte la web app. Apple Developer Program e ambiente macOS per compilazione/firma saranno necessari nella fase opportuna; nessun acquisto eseguito.

## Continuità cloud e limiti

Il repository, questo documento e `AGENTS.md` sono il punto di continuità. La cronologia completa del progetto non viene trasferita automaticamente, né le connessioni degli account. Aggiornare questo documento con decisioni approvate e risultati verificati dopo ogni passaggio significativo. Le richieste nuove dell'utente hanno precedenza sugli accordi qui riepilogati.

L'ambiente cloud deve essere privato per Daniele e indipendente dal suo Mac. Il setup deve installare le dipendenze della root e far passare test/build senza database produttivo. Per un'anteprima runtime aggiungere un database dedicato e dati non produttivi; non inventare un URL di anteprima funzionante quando manca.

Compilare iOS richiede macOS/Xcode o un servizio appropriato, distinto dall'ambiente Linux cloud. Nessun servizio a pagamento senza OK. Non collegare l'ambiente a un host Mac remoto facendo credere che funzioni con il Mac spento.

## Verifiche più recenti

- 19 ottobre, ultimo rilascio web: disattivazione delle illustrazioni dalle schede pubbliche del bestiario, comprese le immagini generiche di ripiego, con archivio persistente delle 336 WebP, fonti e codice di ripristino. Etichetta «Equipaggiamento» uniforme nell'editor, anteprima e pagina pubblica, mantenendo la chiave dati esistente. Branch `fix/bestiario-no-art-equipment-20261019`, commit `dc36bd670f8d2d727daf7ac01f0dff9a2b39882e`, deployment `dpl_G3Up3AxBDSjnZ3CxxhEBh4ZYdA2M` READY con alias ilgrimorio.app. Test mirati, suite e build riusciti. Registro `docs/releases/2026-10-19-bestiario-senza-illustrazioni.md`. La precedente autorizzazione alle foto descrive lo storico, non la scelta attuale.

- 19 ottobre: correzione web pubblicata dopo «Pubblica allora»: commit `32513f2f2529ea4a4e5870c5a833da3019c87f86`, branch `fix/admin-creature-fields-20261019`, deployment `dpl_4CGFysyZaNchqNKtbjaSjQnWYwjN` READY con alias ilgrimorio.app. Campi amministrativi iniziativa, bonus competenza, equipaggiamento e azioni bonus; collegamenti automatici per nomi esatti nelle liste incantesimi anche senza corsivo. Nessuna modifica dei record reali. Ramo iPhone invariato a `e22f06e`. Test locali e build riusciti; verifica browser non eseguita per rifiuto esplicito auto-review OpenAI. Metadati di rilascio e log runtime controllati. Registri `docs/releases/2026-10-19-editor-creature-campi-incantesimi.md` e `docs/releases/2026-10-19-pubblicazione-editor-creature.md`. Ultimo rollback: `dcb2633` / `dpl_84A2nDQ3SbuQzSYbac5s8os2p6gk`.

- Regressione AVIF: Daniele segnala foto più lente/scattose su iPhone dopo `d4d9db9`. Ritirata quella modifica applicativa ripubblicando `96138096486df4f4f4c7ae82baaf48676b1bcff7` (deployment `dpl_6npjg7EhTQB2DMqoZzQVwGso96NT`): WebP predefinito, 336 foto e crediti conservati. Audit con esito negativo in `docs/releases/2026-10-18-prestazioni-immagini.md`. Non considerare il minor peso una validazione della fluidità e non riattivare AVIF automaticamente. Verificare sempre il deployment corrente prima di altri lavori.

- Rilascio illustrazioni autorizzato successivamente da Daniele: branch `release/official-art-20261018`, base crediti compatti `b1c9717`. Selettore abilitato anche in produzione per 336 immagini; cinque schede senza foto restano con sfondo generico. La precedente indicazione «solo preview» descrive la fase iniziale. Verificare il deployment Vercel corrente per il commit live, come sempre; niente integrazione automatica iPhone. Registro in `docs/releases/2026-10-18-illustrazioni-bestiario.md`.

- Illustrazioni ufficiali: Daniele ha approvato la prova grafica Aboleth/Orsogufo (`bb52972`) e la sua estensione al bestiario. Branch web separato `ui/official-creature-art-20261018`: registro di 336 immagini su 341 creature, cinque fallback espliciti, fonte/copyright vicini alle immagini. Resta attivo solo in preview, senza modifiche al database o al client iPhone. Dettagli, fonti mancanti e limiti della verifica dei diritti in `docs/releases/2026-10-18-illustrazioni-bestiario.md`. Il registro delle immagini non è una licenza SRD/Creative Commons. Nessun merge automatico verso iPhone.

- `npm test` completo e `npm run build`: riusciti sulla modifica etichette (`0dcb9f3`).
- 389 incantesimi, 241 mostri e 100 animali senza bollini nelle righe, verificati sul dominio ufficiale.
- Colpo Accurato, Cespuglio risvegliato e Aquila con libro/2024; Sciame di ragni con libro/2014 nei dettagli.
- Area statistiche non accessibile senza sessione: rimando al login.
- Documentazione iOS salvata e tracciata in GitHub. Ambiente Codex Cloud da considerare creato/pubblicato **solo dopo conferma nell'interfaccia**, non per la sola presenza di questi file.
