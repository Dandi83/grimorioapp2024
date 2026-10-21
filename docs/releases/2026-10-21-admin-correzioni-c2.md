# Admin «Modifica tutto» — PR C2: tutte le sezioni (21 ottobre 2026)

Ramo `admin/correzioni-c2-20261021`, sopra la C1 (#58). Stesso principio: `lib/data` mai modificato,
correzioni nel database applicate in visualizzazione, tracciate e annullabili.

## Come si aggiunge una sezione (un solo punto)
1. `lib/content-adapters.ts`: un adattatore `read(scheda) → campi` / `write(scheda, campi) → copia`.
2. `lib/content-sections.ts`: una voce `cardSection({...})` con titolo, edizioni, campi fissi, campi dinamici (paragrafi), campi bloccati, elenco schede, link pubblico, pagine da aggiornare.
3. `lib/corrected-content.ts`: una riga `getCorrectedX = () => correctEntries("chiave", elenco, adattatore)` e usarla nelle pagine della sezione e in `lib/search-index.ts`.
I test (`tests/content-overrides.cjs`) controllano da soli che ogni valore stampato della nuova sezione superi i propri controlli e che leggere/riscrivere restituisca la scheda identica.

## Campi per sezione
| Sezione | Modificabili | Non modificabili (perché) |
|---|---|---|
| Armi | Nome, Costo, Danni, Tipo di danno, Peso, Proprietà, Padronanza (2024) | Testi di proprietà/padronanze (Manuale), Gittata (dalle proprietà), Pagina, Confronto (calcolato) |
| Armature | Nome, Classe Armatura, Costo, Peso, Forza richiesta | Svantaggio a Furtività (sì/no), Regole e descrizioni comuni, Pagina |
| Equipaggiamento d'avventura | Nome, Costo, Peso, ogni Paragrafo | Tabelle (dotazioni, capienza, gruppi), Abbinamenti 2014→2024, Pagina |
| Strumenti | 2024: Nome, Costo, Caratteristica, Peso, Utilizzo, Creazione; 2014: Nome, Costo, Peso, Paragrafi | Varianti condivise (giochi, strumenti musicali), Testi introduttivi, Pagina |
| Oggetti magici | Nome, Riga del tipo, ogni Paragrafo e Voce di elenco | Tipo/rarità/sintonia dei filtri, Tabelle e blocchi statistiche, Pagine |
| Condizioni | Nome, ogni Paragrafo e Titoletto (2024 e 2014) | Pagina |
| Manuale | Titolo, ogni Paragrafo e Titoletto | Tabelle, Voci di Equipaggiamento (si correggono nelle loro sezioni) |
| Incantesimi, Mostri | Come prima, dall'editor (record del database) | — |

## Incantesimi e mostri
Restano modificati dall'editor di sempre (`/admin/incantesimi`, `/admin/mostri`). Ogni salvataggio ora scrive nel
**Registro modifiche** il valore prima/dopo di ogni campo cambiato (tabella `grimorio_editor_log`, migrazione additiva).
«Annulla modifica» rimette il valore precedente nel database, solo se il campo non è stato cambiato di nuovo
(prima si annulla la modifica più recente). Se il registro non è disponibile, l'editor salva comunque.
Non registrati: campi extra dei mostri (dettagli, habitat) ed etichetta edizione.

## Pagine pubbliche
Armature, Avventura, Strumenti, Oggetti magici, Condizioni (elenco del Compendio e pagine `/manuale/condizioni-*`),
Manuale: valori corretti, nota «Corretto rispetto al manuale originale» con il testo stampato (fino a 280 caratteri),
aggiornamento entro 5 minuti o subito dopo il salvataggio, ricerca generale con i nomi corretti.

## Prove
`tests/content-overrides.cjs` (registro, controlli su oltre 5.000 valori stampati, adattatori, salvataggi in tutte le sezioni),
`tests/editor-log.cjs`, prova nel browser «admin corrections in every section». `e2e/run.mjs` ora parte con la cache dei dati vuota.
