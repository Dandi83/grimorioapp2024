# Area riservata: 2024 e 2014 identiche — 23 ottobre 2026

Ramo `fix/admin-edizioni-identiche-20261023`, base `main` b84212e (#69). Non unito: attende l'OK di Daniele. Le due edizioni ora sono uguali nell'aspetto e nel comportamento; cambia solo il colore del selettore e della fascia.

## Nomi degli incantesimi (solo visualizzazione)
`lib/spell-name.ts` → `spellName(nome, edizione)` scrive i nomi come il manuale italiano:
- maiuscola solo all'inizio;
- nomi propri conservati (Agathys, Bigby, Drawmij, Evard, Hadar, Leomund, Melf, Mordenkainen, Nystul, Otiluke, Otto dopo «di», Rary, Tasha, Tenser, Yolande, più alcuni di riserva);
- «0TILUKE» (con lo zero, così nel database) mostrato «Otiluke»;
- dopo la barra la grafia di ciascun manuale: «Antipatia/Simpatia» nel 2014 (SRD 5.1), «Antipatia/simpatia» nel 2024 (SRD 5.2.1).

Si usa nella scheda pubblica, negli elenchi, nei preferiti, nell'indice di ricerca, nell'editor, negli elenchi admin, nel Registro, nella scelta degli incantesimi dei personaggi e nelle Statistiche. I nomi salvati non vengono riscritti.

`tests/spell-name.cjs`: i 319 nomi SRD 5.1 identici al file, 334 nomi SRD 5.2.1 coerenti con la grafia stampata, l'elenco dei nomi con maiuscole interne.

I mostri avevano già la grafia del manuale (l'unica maiuscola interna è «Minotauro di Baphomet»): nessuna modifica.

## Elimina
- Niente Elimina sulle schede con fonte SRD verificata, in tutte e due le edizioni: è la stessa regola che fissa l'edizione.
- Elimina c'è solo sulle schede create o aggiunte dall'amministratore, comprese le sintesi originali.
- `deleteSpellAction` e `deleteMonsterAction` rifiutano anche una chiamata diretta con «Le schede SRD non si eliminano: si possono solo correggere.».

## Etichetta di fonte
- Sotto il nome, in entrambe le edizioni: «SRD 5.1», «SRD 5.2.1», «Sintesi originale» (nel codice: `original-rules-summary`, «Sintesi originale delle regole 2024») oppure «Aggiunta da te».
- Tolti «dai file SRD», l'asterisco delle sintesi e la nota «Scheda dai file SRD…» dell'editor.
- Le note dei mostri e del campo habitat dicono «Scheda SRD» al posto di «dai file del progetto».

## Altre differenze uniformate
- Il pulsante attivo del selettore ha il colore della fascia (blu 2014, bordeaux 2024): prima era bordeaux in tutte e due.
- Elenco degli incantesimi ordinato per nome mostrato in tutte e due le edizioni. Prima il 2024 era ordinato per nome e il 2014 seguiva l'ordine del file.
- L'etichetta di fonte non si tronca a 390 px: è in un elemento a parte.
