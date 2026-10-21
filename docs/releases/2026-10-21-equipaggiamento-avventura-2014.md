# Equipaggiamento d'avventura: edizione 2014 (21 ottobre 2026)

`/equipaggiamento/avventura` ha ora il selettore 2014/2024, come Armi e Armature (stessa scelta ricordata).

## Dati 2014

- `lib/data/srd-adventuring-gear-5.1-it.json`, generato da `scripts/transcribe-srd-equipment.py … gear2014` dal PDF SRD 5.1 italiano (pp. 74–78), letto colonna per colonna in ordine di lettura:
  - tabella «Equipaggiamento d'avventura»: 99 righe (con i sottoelementi di Focus arcano, Focus druidico, Munizioni, Simbolo sacro), ognuna con il testo stampato e l'impronta sha256;
  - 42 descrizioni (40 righe con testo; «Corda» vale per canapa e seta; Focus arcano, Focus druidico e Simbolo sacro sui gruppi);
  - «Capienza dei contenitori» (13 righe e la nota dello zaino), mostrata nelle schede dei contenitori;
  - 7 «Dotazioni» con prezzo e contenuto.
- `lib/adventuring-gear-2014.ts` costruisce gli oggetti 2014; `lib/adventuring-gear-editions.ts` li abbina al 2024 solo per nome (maiuscole e parentesi ignorate), per i nomi della tabella 2024 o per l'elenco di Daniele.
- Correzioni di sola visualizzazione (`lib/data/adventuring-gear-repairs-20261021.json`): «dal quel punto» → «da quel punto» (Attrezzi da scalatore), «fino 6 metri» → «fino a 6 metri» (Fuoco dell'alchimista).

## Indirizzi

- Gli oggetti 2024 mantengono il loro indirizzo; un oggetto con lo stesso nome nel 2014 è nella stessa pagina, con il selettore.
- Un oggetto 2014 con nome diverso ha il suo indirizzo dal nome 2014 (es. `/canestro`), che apre il 2014; il selettore porta all'altra scheda (`/cesto`).
- Un oggetto solo 2014 (es. `/abaco`) ha l'indirizzo dal nome 2014 e la nota «Solo edizione 2014»; scegliendo l'altra edizione si torna all'elenco con «Questo oggetto non c'è nel 2024.»
- Tabella «2014 → 2024» solo dove cambia nome, costo o peso.

## Altro

Guard del bundle: i testi 2014 sono tra quelli esclusi dal browser. Service worker: già comprende tutte le pagine `/equipaggiamento/avventura/…`. `/fonti`: riga aggiornata per SRD 5.1.
