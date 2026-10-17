# Verifica delle 88 descrizioni precedenti — solo preview

Questa revisione estende la preview `f933ef61bf595f3e842e8e3ad8f4c8c6d93addba` dopo la richiesta di Daniele di verificare anche le 88 descrizioni già presenti e uniformarle alle trascrizioni ufficiali del SRD.

## Esito

- 78 delle 88 schede hanno una corrispondenza nel SRD 5.2.1 italiano.
- Per queste 78, il testo completo e i campi dell’incantesimo vengono sostituiti con la trascrizione ufficiale. Sono compresi Dardo Incantato e Deflagrazione Occulta.
- Le 242 trascrizioni iniziali sono identiche a quelle della preview precedente.
- Totale risultante: 320 schede con testo integrale SRD, 10 con descrizione precedente non attribuita al SRD, 39 senza descrizione; 369 schede complessive.
- Il conteggio delle trascrizioni distinte è 319 perché Respirare sott’acqua ha due ID, mantenuti per preservare i riferimenti e i preferiti.

Sono state controllate anche le due corrispondenze con nomi differenti: Aura magica di Nystul → Aura magica dell’arcanista, Capanna di Leomund → Capanna. Le fonti e le pagine di tutte le trascrizioni sono riportate nel dataset.

## Dieci schede non presenti nel SRD italiano

- Amicizia
- Arma elementale
- Armatura di Agathys
- Aura di purezza
- Aura di vitalità
- Braccia di Hadar
- Calderone ribollente di Tasha
- Cerchio di potere
- Cordone di frecce
- Corona di follia

Per queste dieci schede il controllo documentale ha stabilito l’assenza dal SRD; non certifica la correttezza dei testi precedenti rispetto ad altri manuali o a D&D Beyond. I testi rimangono invariati e senza etichetta di trascrizione ufficiale SRD.

## Protezione dei dati e reversibilità

La sostituzione è autorizzata soltanto per le 78 descrizioni preesistenti individuate: il loro hash SHA-256 è registrato in `lib/data/srd-revisions-20261017.json`. Una successiva modifica editoriale differente non viene sovrascritta. Le schede senza testo usano il contenuto SRD disponibile.

L’integrazione è soltanto in lettura e non modifica il database di produzione. Nessun ID, preferito o scheda è stato eliminato. Il rollback del commit rimuove questa revisione. La produzione resta sul commit `032a5104ecf3772f0a212072862ae6cd768b0649` finché Daniele non autorizza la pubblicazione.

## Fonte e verifica

Documento: https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf

SHA-256: `a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718`.

```sh
python3 scripts/transcribe-srd.py /percorso/IT_SRD_CC_v5.2.1.pdf
npm test
npm run build
node scripts/export-srd.mjs
```

Il confronto automatico con il PDF verifica tutti i caratteri alfanumerici dei blocchi e delle tabelle, oltre all’ordine delle colonne e ai metadati. Le sostituzioni e la preservazione delle modifiche successive sono coperte dai controlli automatici. La fixture di Deflagrazione Occulta proviene dalla scheda preesistente mostrata da Daniele e riproduce la differenza rispetto alla fonte 2024, che ammette bersagli creatura o oggetto.
