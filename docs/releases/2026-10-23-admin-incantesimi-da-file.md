# Area riservata: tutti gli incantesimi, anche quelli dai file SRD — 23 ottobre 2026

Ramo `fix/admin-incantesimi-file-20261023`, base `main` c6501bf (#68).

## Problema
/admin/incantesimi, /admin/mostri e la home admin leggevano gli incantesimi con `getAllSpells({ includePreview: false })`, che escludeva le schede dai file:
- i 319 incantesimi 2014 di `srd-spells-5.1-it.json`;
- le aggiunte SRD 2024 di `previewSpellRows`.

Per questo nell'edizione 2014 l'admin mostrava «0 incantesimi», mentre il sito pubblico ne mostra 319.

## Correzione
- `getAdminSpells()` (`lib/spells.ts`) legge lo stesso catalogo dell'elenco pubblico:
  - righe del database più schede dai file;
  - esclusi i doppioni unificati (`MERGED_SPELL_IDS`), che sul sito rimandano a un'altra scheda;
  - con i valori salvati e non con le riparazioni di sola visualizzazione.
- Le schede ancora solo nei file sono segnate «dai file SRD» e non hanno il pulsante Elimina.
- I mostri usavano già il catalogo completo (`getAllMonsters`).

## Modifica delle schede dai file
`updateSpellAction`:
- **Primo salvataggio con almeno un campo cambiato**: crea la riga nel database con i valori del file. Cambiano solo i campi davvero modificati e solo quelli vanno nel Registro modifiche, con «prima» uguale al valore del file.
- **Salvataggio senza modifiche** (campi ed edizione uguali): non scrive niente. Niente riga, niente etichetta, niente registro. Vale anche per le schede già nel database.
- L'edizione che la scheda ha già non viene salvata come etichetta manuale.
- **Annulla dal registro** (`undoEditorAction` → `dropSpellRowLikeFile`): se dopo l'annullamento la scheda ha di nuovo esattamente i valori del file, la riga viene tolta. Il sito torna a leggere il file, con la fonte SRD, e la scheda pubblica è identica a prima.
- Una scheda modificata perde l'indicazione della fonte SRD finché il testo è diverso, come già prima per le schede 2014.

## Verifiche
- `tests/spell-file-edit.cjs`:
  - catalogo admin uguale all'elenco pubblico per 2024 e 2014 (319 schede 2014);
  - doppioni esclusi;
  - salvataggio senza modifiche: nessuna riga, nessun registro, nessuna etichetta;
  - un campo cambiato: riga creata con i valori del file e una sola riga di registro;
  - annullamento: la riga sparisce e la scheda pubblica è identica.
- Prova nel browser:
  - conteggi di incantesimi e mostri dell'admin uguali a quelli pubblici, nelle due edizioni;
  - «Allarme» 2014 dal file: salvataggio senza modifiche, gittata cambiata (una riga nel registro), annullamento con scheda pubblica identica;
  - elenco 2014 a 360, 375 e 390 px.

## Etichetta dell'edizione (aggiunta)
- **Righe degli elenchi**: dalle righe di Incantesimi e Mostri sono stati tolti la tendina «Automatica / D&D5e 2014 / D&D5e 2024» e il pulsante «Salva etichetta». L'edizione si sceglie con il selettore in alto e il componente `admin-edition-picker.tsx` è stato rimosso.
- **Editor**, in cima, tramite `AdminEditionField`:
  - schede con fonte SRD verificata: testo fisso «Edizione 2014 · SRD 5.1» o «Edizione 2024 · SRD 5.2.1». Il modulo non invia l'edizione e i dati salvati restano come sono;
  - fonte degli incantesimi: trascrizione esatta del file 5.1 (`getLegacySpellSource`) o testo SRD 5.2.1 (`getSrdSource`);
  - fonte dei mostri: `provenienza` verificata;
  - altre schede (create o aggiunte qui): tendina «Edizione» 2024/2014, che parte dall'edizione della scheda. Prima di salvare nell'altra edizione chiede «Spostare questa scheda nell'edizione …?»; con «Annulla» non si salva niente;
  - «+ Nuovo» parte dall'edizione selezionata in alto.
- **Salvataggio**: le azioni non salvano come etichetta l'edizione che la scheda ha già. Le etichette già salvate restano.
- `tests/catalog-editions.cjs`:
  - per ogni scheda del catalogo l'editor mostra l'edizione dell'elenco pubblico;
  - le fonti SRD fissano l'edizione giusta;
  - il salvataggio di ogni incantesimo senza modifiche non scrive niente e nessuna scheda pubblica cambia edizione;
  - una creatura creata qui non riceve un'etichetta inutile.
