# Equipaggiamento d'avventura 2024 (21 ottobre 2026)

Terzo riquadro di `/equipaggiamento`: **Equipaggiamento d'avventura**, per ora solo edizione 2024 (nota «Edizione 2024. La 2014 arriva presto.», nessun selettore).

## Indirizzi

- `/equipaggiamento/avventura`: ricerca per nome, sezione «Dotazioni» (i 7 pacchetti) in evidenza, poi tutti gli 81 oggetti in ordine alfabetico con prezzo e peso.
- `/equipaggiamento/avventura/[id]`: costo, peso, descrizione completa e tabelle collegate (Focus arcani, Focus druidici, Munizioni, Simboli sacri) come schede, senza scorrimento laterale.

## Dati

- `lib/adventuring-gear.ts` costruisce tutto dalla voce `equipaggiamento-equipaggiamento-d-avventura` del Manuale 2024 (pp. 107–113): un oggetto per titolo «Nome (prezzo)» (81 titoli = 81 oggetti), il peso dalla tabella «Equipaggiamento d'avventura», i paragrafi spezzati da un cambio pagina ricongiunti.
- Correzioni di sola visualizzazione in `lib/data/adventuring-gear-repairs-20261021.json`:
  - nomi diversi tra tabella e titoli: «Acciarino e pietra focaia» / «Acciarino con pietra focaia», «Campanella» / «Campana», «Veleno, base» / «Veleno base», «Pergamena magica (livello 1)» e «(trucchetto)» / «Pergamena magica»;
  - refuso «contiene i seguenti i oggetti» (Dotazione da intrattenitore).
- Prezzi del titolo e costi della tabella coincidono per tutti gli oggetti.
- Guard del bundle: i testi della voce sono tra quelli che non devono finire nel codice del browser (l'elenco porta solo nome, prezzo e peso).
- Service worker: `/equipaggiamento/avventura` e le schede tra le pagine salvabili offline. `/fonti`: riga di attribuzione.
