# Schede creatura: stesso schema per 2014 e 2024 — 20 ottobre 2026

Branch `feat/ordine-campi-20261020` da `main` (`9efca50`, 322 schede 2014 pubblicate). Cambiano solo ordine e disposizione dei campi; nessun testo trascritto è modificato.

## Confronto Lich 2024 / Lich 2014 (prima)

Ordine delle sezioni già uguale sulle tre superfici (scheda pubblica, editor, anteprima): caratteristiche → tratti → azioni → azioni bonus → reazioni → azioni leggendarie, ciascuna solo se presente. Le differenze erano di disposizione:

- Intestazione: 2024 «Non morto Medio (mago), neutrale malvagio» (riga del manuale); 2014 «Media · Non morto · qualsiasi allineamento malvagio» (ricomposta dai campi).
- Liste di incantesimi: 2024 una riga per frequenza, etichetta in grassetto e barretta oro; 2014 tutte le righe di seguito, etichette («Trucchetti (a volontà):», «1° livello (4 slot):», «3/giorno ciascuno:») in tondo e nessun raggruppamento.
- Editor: «Equipaggiamento» stava fra le statistiche di combattimento, mentre scheda e anteprima lo mostrano tra immunità e sensi.
- Anteprima dell'editor: nelle schede 2014 senza iniziativa mancava l'iniziativa calcolata dalla Destrezza mostrata dalla scheda pubblica.

## Dopo

- Le schede 2014 mostrano la riga stampata nel PDF («Non morto Medio, qualsiasi allineamento malvagio»), salvata in `sottotitolo_fonte` come per le 2024. Script di trascrizione aggiornato; le 317 schede trascritte coincidono con lo script, le 5 varianti usano la riga della scheda base.
- Le liste 2014 sono raggruppate come quelle 2024 (stesso componente per scheda pubblica e anteprima): etichetta in grassetto su una riga, elenco sotto, barretta oro. Vale anche per le schede inserite a mano con etichette in tondo.
- Editor: «Equipaggiamento» spostato tra le immunità e i sensi.
- Anteprima: iniziativa calcolata dalla Destrezza per le schede 2014 senza iniziativa.
- Attribuzione: una copia di scheda 2014 salvata nel database prima di questo cambio (senza `sottotitolo_fonte`) mantiene la fonte; il database non viene modificato.

Restano differenze di contenuto, non di disposizione: immunità ai danni e alle condizioni su due righe nel 2014 (una sola nel 2024), tiri salvezza solo competenti nel 2014, «Incantesimi» tra i tratti nel 2014 e tra le azioni nel 2024, bonus di competenza assente nel 2014.

## Verifiche

`npm test` (nuovi controlli in `tests/sheet-emphasis.cjs` e `tests/monster-provenance.cjs`), lint, `tsc`, prove catalogo ed editor, `npm run test:e2e` superati. Confronto visivo Lich 2014 prima/dopo su telefono simulato.
