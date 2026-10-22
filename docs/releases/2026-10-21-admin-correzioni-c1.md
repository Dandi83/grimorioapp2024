# Admin «Modifica tutto» — PR C1: infrastruttura e Armi (21 ottobre 2026)

Ramo `admin/correzioni-c1-20261021`, sopra PR B (#57) → PR A (#56) → PR 3 (#55).

## Principio
I file in `lib/data` non vengono mai modificati. Ogni modifica manuale è una riga della tabella
`grimorio_content_overrides`, applicata sopra il valore originale solo quando la pagina viene mostrata,
sempre tracciata (data, valore originale, valore nuovo, motivo, autore) e annullabile.
I controlli di fedeltà dei manuali leggono sempre i file originali.

## Pezzi
- `lib/content-sections.ts`: **unico punto di registrazione** delle sezioni (istruzioni in testa al file).
- `lib/content-validate.ts`: controlli per tipo di campo (dadi, monete, pesi, numeri, elenchi, testo), limiti, niente `<` `>`.
- `lib/content-overrides-apply.ts`: regole di applicazione (vince la più recente non annullata; solo i campi modificabili; correzioni orfane e originali cambiati).
- `lib/content-overrides.ts`: tabella, lettura con cache (tag `content-overrides`, 5 minuti), salvataggio in transazione, annullamento.
- `lib/corrected-content.ts`: **unico punto** in cui le correzioni arrivano alle pagine pubbliche (lato server).
- Pagine pubbliche Armi: elenco e schede con `revalidate = 300` e aggiornamento immediato dopo il salvataggio; nota «Corretto rispetto al manuale originale» con il valore stampato. Indice di ricerca costruito dopo le correzioni.
- Admin: `/admin` a riquadri con contatori; `/admin/incantesimi` e `/admin/mostri` (editor di prima, invariati); `/admin/contenuti/armi` (2024/2014, ricerca, MODIFICATO); `/admin/contenuti/armi/<id>?edizione=` (un campo per dato, originale sotto, Ripristina, motivo obbligatorio, conferma); `/admin/registro` (filtri, prima/dopo, motivo, Annulla modifica, storico, correzioni documentate in sola lettura, Esporta JSON).
- Migrazione additiva: la tabella si crea al primo salvataggio; le pagine pubbliche non creano tabelle (senza tabella mostrano l'originale).

## Armi: campi
| Modificabili | Non modificabili (perché) |
|---|---|
| Nome, Costo, Danni, Tipo di danno, Peso, Proprietà, Padronanza (solo 2024) | Testi di proprietà e padronanze (regole comuni, sezione Manuale); Gittata (si ricava dalle proprietà); Pagina della fonte (riferimento al PDF); Confronto 2014→2024 (calcolato dai valori mostrati) |

## Import
Solo esportazione in C1. Nessun import automatico.
