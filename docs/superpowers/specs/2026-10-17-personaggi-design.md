# I miei personaggi — specifica v1
Data: 17 ottobre 2026
Repository: Dandi83/grimorioapp2024
Base: preview/manuale-srd-20261017
Branch di lavoro: preview/personaggi-20261017
Stato: progetto funzionale approvato in chat; specifica tecnica da revisionare prima del piano e dell'implementazione.

## Obiettivo e decisioni approvate
Compilare direttamente nell'app più schede personaggio private, modificarle durante le sessioni e ritrovarle tramite account personale su iPhone, iPad e computer. Base di consultazione SRD 2024 già integrata, con campi personalizzabili. Stile coerente con GrimorioApp. Sviluppo e verifiche soltanto in preview; nessuna pubblicazione ufficiale o acquisto autorizzato.

## Stato verificato del progetto
Next.js, React, PostgreSQL e Drizzle. Lo schema verificato sul branch del Manuale contiene spells e monsters, senza account personali o personaggi. Esiste un'autenticazione amministratore dedicata, da mantenere separata. I preferiti usano localStorage; non costituiscono un archivio sincronizzato. La nuova funzione deve aggiungere autenticazione personale e persistenza server. I sorgenti locali includono copie precedenti e modifiche: l'implementazione partirà da checkout isolata del branch verificato, senza sovrascriverle.

## Approccio scelto e alternative
Raccomandato: schede strutturate in PostgreSQL, con API private e interfaccia integrata nell'app. Permette sincronizzazione e controllo della proprietà dei dati mantenendo lo stack attuale.
Alternativa locale: più semplice, ma non soddisfa sincronizzazione e account.
Alternativa servizio esterno di schede: aggiunge dipendenza e separa l'esperienza dal Manuale; non scelta.
Non introdurre fornitori a pagamento; verificare prima le risorse esistenti. Se la preview condivide il database di produzione, non applicare migrazioni: serve un database isolato prima dei test persistenti.

## Esperienza e navigazione
Accesso dalla Home a “I miei personaggi”, distinto da Classi. Nessuna riorganizzazione delle altre voci.
Percorsi proposti: /personaggi, /personaggi/nuovo, /personaggi/[id], /account.
L'elenco mostra nome, classe, livello e ultima modifica. Stato vuoto con “Crea personaggio”.
Creazione progressiva: nome obbligatorio, livello iniziale 1, resto compilabile in seguito; le sezioni incomplete non impediscono il salvataggio.
Scheda con sezioni “In gioco”, “Caratteristiche”, “Capacità”, “Incantesimi”, “Inventario”, “Note”.
Su telefono PF, CA, iniziativa, attacchi e risorse sono immediatamente accessibili. Input con etichette, focus visibile e pulsanti utilizzabili al tocco; nessuno scorrimento orizzontale della scheda a 390/430 px.
Ritratto escluso dal primo rilascio: non necessario per rendere utilizzabile la scheda.

## Contenuto della scheda
Identità: nome, classe/sottoclasse, livello 1–20, specie, background, descrizione libera.
La prima versione supporta una classe strutturata; eventuale multiclasse si annota come personalizzazione, senza automazioni.
Caratteristiche: sei punteggi, competenze nei TS e nelle abilità, maestria, bonus manuali.
Combattimento: CA, velocità, iniziativa, PF massimi/attuali/temporanei, dadi vita, salvezza contro morte, condizioni e attacchi modificabili.
Capacità: titolo, testo personale, risorse con valore corrente/massimo e indicazione libera del recupero.
Incantesimi: riferimenti agli ID esistenti, conosciuti/preparati, caratteristica da incantatore, slot correnti/massimi per livello; risorse separate configurabili per Magia del Patto.
Inventario: elementi liberi e riferimenti alle voci disponibili del Manuale, quantità, peso opzionale, equipaggiato, monete.
Note: testo personale semplice, senza esecuzione HTML.
Contenuti personalizzati privati non entrano nei cataloghi pubblici.
Nessun avanzamento guidato, assegnazione automatica completa di capacità, verifica di legalità del personaggio o condivisione pubblica.

## Calcoli e trasparenza
Modificatore caratteristica: floor((punteggio - 10) / 2).
Competenza per livello totale: 2 + floor((livello - 1) / 4), per livelli 1–20.
TS e abilità: modificatore + competenza/maestria configurata + bonus manuale.
Iniziativa: Destrezza più bonus manuale; CD incantesimi: 8 + competenza + modificatore scelto; attacco magico: competenza + modificatore scelto.
Mostrare origine del valore e override esplicito ripristinabile. CA, PF massimi, velocità, slot e attacchi restano configurabili; non fingere automazioni complete per armature, talenti o sottoclassi.
I valori di risorse devono restare tra zero e massimo; PF massimi almeno 1; PF attuali tra zero e massimo. PF temporanei separati. Nessun consumo automatico di slot aprendo un incantesimo.
Riposare non ripristina implicitamente risorse: un eventuale comando di ripristino mostra i valori coinvolti prima dell'applicazione.

## Account e privacy
Account personali distinti dall'amministrazione. Prima versione proposta: nome utente univoco e password, senza dipendere da invio email. Codice di recupero mostrato una sola volta alla registrazione e conservato lato server solo come hash; recupero password invalida sessioni precedenti e ruota il codice.
Password con hash scrypt e salt casuale; sessioni con token casuale, hash lato server, cookie HttpOnly/Secure/SameSite e scadenza. Protezione CSRF/Origin per scritture e limitazione tentativi su login/registrazione/recupero. Nessuna credenziale nel client o nei log.
Ogni operazione filtra per proprietario derivato dalla sessione; mai fidarsi di ownerId inviato dal client. Schede private escluse da cache condivise, sitemap, indicizzazione e analitiche del contenuto.
Logout rimuove dati privati dalla memoria dell'interfaccia. La sincronizzazione dei preferiti pubblici esistenti è fuori scope.

## Dati e API
Tabelle additive in ambiente isolato:
- player_accounts: id, username normalizzato univoco, password_hash, recovery_hash, timestamps.
- player_sessions: token_hash, account_id, expires_at.
- player_characters: UUID, owner_id indicizzato, schema_version, revision crescente, sheet JSONB, timestamps.
- player_character_versions: character_id, owner_id, revision, sheet JSONB, timestamp; massimo 20 versioni precedenti.
- player_auth_attempts: dati minimi e scadenza per limiti tentativi persistenti, senza password/token grezzi.
Validazione server condivisa con il client per shape, limiti numerici, lunghezze e dimensione totale (massimo 256 KiB per scheda). Riferimenti al catalogo validati; schede esistenti restano leggibili se un riferimento cambia, mostrando etichetta di fallback.
API per elenco, creazione, lettura, aggiornamento, eliminazione, storico e ripristino. Tutti i percorsi privati richiedono sessione valida e proprietà, inclusi storico ed eliminazione.
Eliminazione con conferma del nome, cancellazione delle versioni e nessun effetto sui cataloghi. Ripristino storico crea una nuova revisione senza sovrascrivere la cronologia.

## Salvataggio e sincronizzazione
Debounce di circa 800 ms, con indicatore “Modifiche da salvare”, “Salvataggio”, “Salvato”, “Connessione assente” o “Conflitto”.
Ogni PATCH invia revisione di partenza e identificatore idempotente. Transazione con confronto revisione, snapshot precedente e incremento atomico. Retry della stessa mutazione non crea duplicati.
Conflitto 409 tra dispositivi: niente sovrascrittura silenziosa; conservare la bozza in memoria e consentire confronto tra dati locali e versione server prima di riprovare.
Offline: modifiche in memoria segnalate come non sincronizzate; avviso prima di lasciare la pagina con modifiche pendenti. Nessuna promessa di modalità offline completa o di conservazione dopo chiusura forzata. Non usare localStorage come archivio privato predefinito.

## Integrazione col Manuale
Selezioni per classi, specie e background dagli ID già presenti, con opzione personalizzata.
Condizioni apribili nel pannello esistente; incantesimi apribili senza perdere modifiche pendenti, usando lo stesso meccanismo di consultazione o una nuova scheda.
Conservare attribuzioni dei contenuti SRD. Le note personali non vengono presentate come testo ufficiale.

## Verifiche di accettazione
- Utente A crea due schede e le modifica; utente B non può elencarle, leggerle, modificarle, cancellarle o consultarne lo storico, anche conoscendo gli ID.
- Persistenza verificata dopo reload e in due sessioni/dispositivi; account amministratore separato.
- Valori derivati controllati ai livelli 1, 4, 5, 9, 13, 17, 20 e con punteggi dispari, maestria e override.
- PF/slot/risorse rispettano limiti e recupero storico restituisce contenuto verificabile.
- Due modifiche concorrenti producono conflitto esplicito; retry non duplica; errori di rete non mostrano “Salvato”.
- Sessione scaduta, recupero account, logout, tentativi ripetuti e payload invalidi gestiti senza perdere silenziosamente bozze.
- Link SRD e contenuti personalizzati funzionano senza alterare cataloghi e preferiti.
- Controlli visuali 390 e 430 px, tablet e desktop; prova su telefono reale da segnalare separatamente se indisponibile.
- Test esistenti e build superati; nessun cambiamento a produzione.
La funzione non si dichiara completata finché account privati e salvataggio reale non sono verificati end-to-end.

## Sequenza proposta per il successivo piano
1. Checkout isolata e verifica database preview.
2. Account personali, sessioni, recupero e prove di isolamento.
3. Schema personaggi, revisioni, API e conflitti.
4. Compilazione guidata, scheda e collegamenti.
5. Comandi durante il gioco, storico e verifiche responsive.
6. Preview per revisione di Daniele; produzione richiede autorizzazione separata.
