# Equipaggiamento: armature 2014 e 2024 (21 ottobre 2026)

Seconda voce della sezione Equipaggiamento, costruita sopra le armi (PR del passo 3).

## Indirizzi

- `/equipaggiamento/armature` — gruppi Armature leggere / medie / pesanti / Scudo, ognuno con la riga dei tempi per indossare e togliere dell'edizione scelta. Ogni voce: scudo con la CA, nome, etichette aggiuntive, costo e peso.
- `/equipaggiamento/armature/[id]` — scheda con CA, peso, costo, testo della CA come stampato, descrizione (2014) e regole dell'edizione scelta: categoria, CA, Forza, Furtività, competenza, indossare e togliere.

## Revisione del 21 ottobre: niente ripetizioni

- Scudetto: numero della CA e sotto solo ciò che serve a leggerla: «+ Des» (leggere), «+ Des / max 2» (medie), niente per le pesanti e per lo scudo («+2»).
- Etichette accanto al nome: solo «For 13/15» e «Furtività: svantaggio». Tolte «+ Des», «CA fissa» e «Serve competenza».
- Scheda: lo scudetto porta numero e «CA», la riga sotto solo il resto del valore stampato («+ modificatore di Destrezza (max 2)»); Peso e Costo; Forza, Furtività e i tempi per indossare e togliere stanno ciascuno in una sola scheda delle regole.
- In alto nell'elenco: «‹ Equipaggiamento».

## Dati e fonti

- `lib/data/srd-armor-it.json`, generato da `scripts/transcribe-srd-equipment.py … armor`:
  - SRD 5.1 italiano pp. 69–71: tabella Armature, tabella «Indossare e togliere armature», regole e descrizioni (con impronta sha256);
  - SRD 5.2.1 italiano p. 104: tabella Armature, con i tempi nelle intestazioni dei gruppi.
- 13 voci per edizione (12 armature + scudo), numeri identici; nomi diversi (2014 «Imbottita», 2024 «Armatura imbottita»…). L'id è il nome 2014.
- Regole 2024 lette dalla voce «Armature» del Manuale 2024, senza copie. Il testo del PDF spezza «Arma-tura» su due colonne: ricomposto in «Classe Armatura».
- Scudo 2024: «azione di Utilizzo per indossare o togliere» (nel 2014: 1 azione).
- La tabella del Manuale 2024 (voce «Armature») è sostituita da un riquadro verso la sezione.

## Verifiche

`tests/equipment.cjs` (13 voci, numeri uguali, confronto con la tabella della richiesta, tempi, etichette, regole per ogni scheda), `scripts/check-manual.mjs`, e2e (elenco nelle due edizioni, tempi, scheda 2014 con Forza e descrizione, nessuno scorrimento orizzontale a 375 px, 13 schede 200).
