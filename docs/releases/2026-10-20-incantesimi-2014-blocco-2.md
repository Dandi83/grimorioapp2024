# Incantesimi 2014 — blocco 2 (20 ottobre 2026)

Secondo dei 7 blocchi approvati: 50 incantesimi dell'SRD 5.1 italiano, nell'ordine del PDF, da «Compulsione» a «Faro di speranza» (totale pubblicato: 100).
Il blocco 1 finiva con «Comprensione dei linguaggi»; nel PDF seguono «Compulsione», «Comunione», «Comunione con la natura», «Confusione», «Cono di freddo» e poi «Conoscenza delle legende». Per non lasciare buchi il blocco 2 parte da «Compulsione».

## Cosa cambia
- `lib/data/srd-spells-5.1-it.json`: aggiunti i record del blocco 2 (stessa trascrizione, stesso PDF, blocco 1 invariato).
- `lib/data/spell-reference-index-2014.json`: indice leggero aggiornato (100 voci).
- `lib/data/spell-edition-links.json`: 50 nuovi abbinamenti per identificativo inglese. Nomi diversi con lo stesso identificativo: Conoscenza delle legende = Conoscenza delle Leggende, Danza irresistibile = Danza irresistibile di Otto, Disco fluttuante = Disco fluttuante di Tenser, Evocazioni istantanee = Evocazioni istantanee di Drawmij.
- Decisione di Daniele (20/10/2026): Regressione mentale (*feeblemind*) e Punizione marchiante (*branding-smite*) restano senza abbinamento 2024; le 12 differenze col database inglese seguono sempre il PDF italiano.
- Alias dei bollini ora attivi: «creare cibo e bevande» (Djinni 2014) → Creare cibo e acqua 2014; «conoscenza delle leggende» (Ginosfinge 2014) → Conoscenza delle legende 2014.

## Controllo contro il database inglese (5e-bits 2014)
Livello, scuola, rituale, concentrazione, tempo di lancio, componenti, durata, classi. Ricontrollati tutti i 100 record pubblicati.
Blocco 2: 3 differenze, si tiene il PDF italiano:
- Creare cibo e acqua: classi chierico, paladino (EN aggiunge druido).
- Cura ferite di massa: scuola Invocazione (EN conjuration).
- Divinazione: classe chierico (EN druid).
Correzione da immagine: «Dominare persone», livello stampato danneggiato → «Ammaliamento di 5° livello» (EN dominate-person, 5th-level enchantment).

## Correzione del catalogo 2024 (PR separata, approvata il 20/10/2026)
`lib/spell-catalog-repairs.ts` + `lib/data/spell-catalog-repairs-20261020.json`: solo in lettura, il database non viene scritto.
- 42 livelli: il numero viene sostituito **solo** se il livello salvato non è riconoscibile (nessun numero o fuori da 0-9); scuola e classi restano quelle salvate.
- 3 nomi (`veleni`, `i-re-spirare-sott-acqua`, `i-re-spirare-sott-acqua-2`): sostituiti **solo** se il nome salvato è ancora esattamente quello rovinato.
- Ogni correzione fatta nell'area riservata vince; l'area riservata vede sempre i valori salvati.
