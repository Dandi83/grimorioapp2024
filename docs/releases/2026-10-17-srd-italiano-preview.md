# SRD 5.2.1 italiano — preview

## Scopo approvato

Trascrivere integralmente gli incantesimi mancanti disponibili nel documento ufficiale italiano con licenza CC BY 4.0. Baseline di produzione: `032a5104ecf3772f0a212072862ae6cd768b0649`, progetto Vercel `grimorioapp2024`, team `grimorio-app`.

## Risultato

- 242 schede completate da 241 incantesimi SRD distinti.
- 88 descrizioni esistenti preservate, compreso Dardo Incantato approvato.
- 39 schede senza corrispondenza SRD restano da completare.
- Campi di lancio, livello, gittata, componenti e durata trascritti dalla stessa fonte per le 242 schede.
- Correzione dei tre titoli OCR già individuati. I due ID di Respirare sott'acqua sono conservati; nessuna eliminazione di schede o preferiti.
- Tabelle e statistiche incluse; link alla fonte e pagina di attribuzione `/fonti`.

L'integrazione avviene in lettura: le descrizioni del database hanno sempre la precedenza. La preview non esegue migrazioni, aggiornamenti, cancellazioni o accessi a credenziali del database. I contenuti sono versionati nel repository, in `lib/data/srd-italiano-5.2.1.json`. L'esportazione leggibile completa è `docs/srd-incantesimi-integrali.md`.

## Fonte e fedeltà

Documento ufficiale: https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf

SHA-256: `a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718`.

Sono stati normalizzati gli spazi, gli a capo e la sillabazione tipografica. Il contenuto delle regole non è stato riformulato. La trascrizione rispetta l'ordine delle colonne del PDF; ogni blocco e ogni tabella è verificato contro tutti i caratteri alfanumerici del testo sorgente. Le tabelle mantengono l'impaginazione e sono scorribili nella scheda su schermi piccoli.

Per riprodurre la verifica, con PyMuPDF e Poppler installati:

```sh
python3 scripts/transcribe-srd.py /percorso/IT_SRD_CC_v5.2.1.pdf
npm test
npm run build
```

`--write` rigenera il dataset soltanto dallo stesso PDF verificato tramite hash. Il documento PDF non è incluso nel repository.

## Pubblicazione

Solo branch di preview. La pubblicazione sull'app ufficiale richiede l'autorizzazione di Daniele. Dopo l'approvazione, verificare nuovamente baseline e preview, quindi integrare il commit testato in `main`. Non è richiesta alcuna migrazione del database. Un rollback del commit ripristina il comportamento precedente.
