# Oggetti magici (21 ottobre 2026)

Nuovo terzo riquadro del Compendio: **Oggetti magici** («Elenco A–Z con rarità e sintonia»), pagine `/oggetti-magici` e `/oggetti-magici/<nome>`. La barra in basso resta di cinque voci (Compendio attivo).

## Dati (entrambe le edizioni)

- `scripts/transcribe-srd-magic-items.py` legge i PDF (mai nel repository) colonna per colonna, con le parole in ordine di flusso (pdfplumber, `use_text_flow`):
  - 2024: SRD 5.2.1 italiano, pp. 237–288, da «Oggetti magici A–Z» a «Zainetto pratico»: **258 oggetti**;
  - 2014: SRD 5.1 italiano, pp. 237–288 più la «Sfera della stirpe dei draghi» (pp. 290–291, sotto «Manufatti»): **240 oggetti**.
- Ogni oggetto inizia al nome nel suo carattere (GillSans-SemiBold 12 / Calibri 12). Seguono la riga tipo/rarità stampata (`rigaTipo`), da cui vengono tipo, dettaglio, rarità e sintonia (sì/no più il requisito), poi il testo in blocchi e la pagina.
- I blocchi sono di quattro tipi:
  - paragrafi, con l'etichetta in grassetto quando c'è;
  - punti elenco;
  - tabelle, ricostruite dalle coordinate e dalle righe ombreggiate del PDF;
  - schede delle statistiche (Avatar della morte, Mosca gigante).
- Corsivi, grassetti e asterischi stampati sono conservati. Ogni oggetto ha la sua impronta sha256, ricalcolata dai test.
- Le posizioni verticali usano la linea di base dei caratteri: nel PDF i riquadri dei caratteri corsivi e grassetti sono spostati di circa 22 punti.
- Le tabelle sono gestite così:
  - le tabelle stampate in due metà affiancate si leggono come una sola;
  - le tabelle che continuano nella colonna dopo, con l'intestazione ripetuta, si uniscono;
  - una tabella stampata dentro un paragrafo segue quel paragrafo;
  - la tabella «Leve dell'apparatus del granchio» del 2024 è stampata tra Arco del giuramento e Arco energetico: resta nell'Apparatus per le coordinate.
- Correzioni di sola visualizzazione (`lib/data/magic-items-repairs-20261021.json`). Sono tre refusi certi:
  - 2024 p. 247, Barca pieghevole: «in una barcone» → «in un barcone»;
  - 2014 p. 243: «Armastura demoniaca» → «Armatura demoniaca»;
  - 2014 p. 284, Tappeto volante: «120 cm × 80 cm» → «120 cm × 180 cm».

## Controllo di fedeltà

`tests/magic-items-fidelity.cjs` confronta ogni oggetto con una seconda estrazione indipendente: il testo `pdftotext -raw` delle stesse pagine, salvato compresso in `tests/fixtures/magic-items-raw-*.txt.gz`. Il confronto riguarda:

- sequenze di 5 parole (minuscole, senza sillabazione, spazi e punteggiatura);
- lunghezze, segnalate se lontane oltre il 10%;
- tutti i numeri nei due sensi (dadi, CD, distanze, durate, bonus).

Il risultato è il 100,0% di similarità media in entrambe le edizioni, nessun oggetto sotto il 95% e nessun numero discordante. `tests/magic-items.cjs` controlla anche:

- che gli intervalli d100/d20/d10/d8 di ogni tabella coprano da 1 al massimo senza buchi;
- il numero di righe delle tabelle principali.

## Pagine (2024)

- **Elenco**:
  - ricerca per nome (maiuscole e accenti ignorati);
  - filtri combinabili (Rarità, Tipo, Sintonia) salvati nell'indirizzo (`?rarita=raro&tipo=anello&sintonia=richiesta&q=…`);
  - contatore dei risultati, ordine alfabetico;
  - rarità colorata nella palette ed etichetta «Sintonia»;
  - nessuna etichetta di edizione.
- **Scheda**:
  - nome grande ed etichette per tipo, rarità e sintonia con il requisito, come stampati;
  - testo completo con tabelle e schede delle statistiche;
  - indietro, fonte con la pagina del PDF, licenza;
  - le tabelle lunghe a più colonne diventano una scheda per riga sul telefono.
- **Regole**: il link «Regole sugli oggetti magici» porta alla voce del Manuale (`/manuale/equipaggiamento-oggetti-magici`) senza copiarne il testo. Compare solo dove il Manuale è pubblicato (anteprima), perché in produzione il Manuale non è ancora visibile.

## Altro

- **Offline**: il service worker salva `/oggetti-magici` e ogni scheda come pagine pubbliche.
- **Guard del bundle**: i paragrafi di entrambe le edizioni sono tra i testi esclusi dal codice del browser.
- **`/fonti`**: aggiunta l'attribuzione degli oggetti magici 2024.
- **Preferiti**: non estesi. Servirebbero un tipo «oggetto magico» nel provider dei preferiti (oggi incantesimi e mostri), il pulsante nella scheda, la riga nella pagina Preferiti e il test di migrazione dei preferiti salvati.

## Edizione 2014 e abbinamenti (seconda PR)

- **Elenco**: selettore 2024/2014 sotto il titolo. È la stessa scelta ricordata dell'Equipaggiamento (`grimorio.equipaggiamento.edizione`). Filtri e ricerca sono gli stessi nelle due edizioni.
- **Abbinamenti** (`lib/magic-items-editions.ts`): per nome, ignorando maiuscole e parentesi, più i 14 nomi diversi dell'elenco di Daniele (`abbinamenti2014` in `lib/data/magic-items-repairs-20261021.json`). Il risultato è **239 coppie**, **19 oggetti solo 2024** e **1 solo 2014** (Unguento rigenerativo).
- **Indirizzi**:
  - un oggetto 2024 tiene il suo indirizzo, e nella stessa pagina c'è anche il 2014 con lo stesso nome;
  - 13 dei 14 nomi diversi hanno un indirizzo 2014 proprio, preso dal nome 2014 (es. `/oggetti-magici/piuma-magica`), che apre il 2014;
  - «Armastura demoniaca» è mostrata come «Armatura demoniaca», quindi ha lo stesso nome e la stessa pagina della 2024;
  - un oggetto di una sola edizione mostra «Solo edizione 2014/2024»;
  - scegliendo l'altra edizione si torna all'elenco con l'avviso «Questo oggetto non c'è nel …».
- **Riquadro «2014 → 2024»**, calcolato dai dati. Mostra nome, rarità e sintonia solo quando cambiano, con il link «Vedi anche la scheda 2014/2024»:
  - **rarità**: Pozione di invisibilità, Piuma di Quaal e Sfera di cristallo;
  - Corno del Valhalla non ha il riquadro, perché cambia solo l'ordine dei metalli;
  - **sintonia**: 16 oggetti. In 8 diventa richiesta o non richiesta, in 8 cambia il requisito.
- **Sfera di cristallo 2014**: rimanda anche alle tre sfere 2024 («Vedi anche nel 2024»).
- **`/fonti`**: aggiunta l'attribuzione degli oggetti magici 2014.
