# Incantesimi 2014 — blocco 1 (20 ottobre 2026)

Piano approvato da Daniele il 20/10/2026: 319 incantesimi dell'SRD 5.1 italiano (pp. 129-222) in 7 blocchi (6×50 + 19).
Questo è il **blocco 1**: codice + 50 incantesimi da «Aiuto» a «Comprensione dei linguaggi».

## Cosa cambia

- `lib/data/srd-spells-5.1-it.json`: file di sola lettura con i 50 incantesimi (id con suffisso `-2014`), pagina, testo di origine con impronta SHA-256 e identificativo inglese (`en`, 5e-bits).
- `lib/srd-spells-2014.ts`: aggiunge gli incantesimi 2014 all'elenco e alle schede **solo in anteprima e produzione**, senza scrivere nel database (come le schede dei mostri 2014). L'area riservata continua a vedere solo le righe del database.
- Selettore «2024 | 2014» negli Incantesimi: ricompare da solo perché ora esistono incantesimi 2014.
- Scheda 2014: etichetta 2014, fonte «SRD 5.1 italiano — pagina», condizioni 2014, riga «Versione 2024 →» quando esiste l'abbinamento; sulla scheda 2024 abbinata compare «Versione 2014 →».
- `lib/data/spell-edition-links.json`: abbinamenti 2014 → 2024 **per identificativo inglese**, mai per solo nome e livello.
- Schede dei mostri 2014: i nomi degli incantesimi già pubblicati diventano bollini verso le schede `-2014` (mai verso il 2024). Alias approvati: «creare cibo e bevande» → `creare-cibo-e-acqua-2014`, «conoscenza delle leggende» → `conoscenza-delle-legende-2014` (attivi quando quegli incantesimi saranno pubblicati). Indice leggero separato `lib/data/spell-reference-index-2014.json` (solo id e nome) per non mandare i testi al browser.
- Protezione della build (`scripts/check-client-bundle.mjs`) estesa al nuovo file: un testo di incantesimo 2014 nel codice del browser fa fallire la build.
- Generatore di personaggi (solo anteprima): continua a usare solo incantesimi 2024.
- `/fonti`: aggiunta la frase sugli incantesimi 2014 (attribuzione CC-BY già presente).

## Come è stato trascritto

`scripts/transcribe-srd51-spells.py` legge il PDF (SHA-256 `2ef143b8…3f7`) dalla cartella temporanea; il PDF **non** è nel repository.
Correzione da immagine in `scripts/srd51-spells-overrides.json`: «Dominare persone» stampa «Ammaliamento di 5° li Eroismoello» (refuso del PDF, verificato guardando la pagina come immagine) → «Ammaliamento di 5° livello»; confermato dal database inglese (dominate-person, 5th-level enchantment). Il testo stampato resta in `sourceLevel`.

## Controllo contro il database inglese (5e-bits 2014)

Campi confrontati: livello, scuola, rituale, concentrazione, tempo di lancio, componenti, durata, classi.
**Blocco 1: 0 differenze su 50.**
Sui 319 totali (blocchi futuri) restano 12 differenze, dove si tiene il PDF italiano: classi di Creare cibo e acqua, Divinazione, Fondersi nella pietra, Luminescenza, Occhio arcano; scuola di Cura ferite di massa, Guarigione di massa, Rinascita; durata «1 giorno» contro «24 ore» (Immagine proiettata, Proibizione, Scopri il percorso, equivalenti); «fino a un minuto» in Fatale (equivalente).

## Abbinamenti 2014 → 2024 (per identificativo inglese)

317 incantesimi 2014 su 319 hanno un gemello 2024 con lo stesso identificativo. Non lo hanno:
- Regressione mentale = *feeblemind*: nel 2024 è stato sostituito da *befuddlement* («Disorientare»), identificativo diverso → nessun abbinamento automatico. **Non** è Vuoto mentale (*mind-blank*, che ha già la sua versione 2014 «Vuoto mentale»).
- Punizione marchiante = *branding-smite*: nel 2024 diventa *shining-smite* («Punizione splendente»), identificativo diverso → nessun abbinamento automatico.
Confermati dall'identificativo pur con nome diverso: tutti gli altri (Aura magica dell'arcanista = Aura magica di Nystul, Capanna = Capanna di Leomund, Individuazione delle malattie e dei veleni = «VELENI» (*detect-poison-and-disease*), Respirare sott'acqua = `i-re-spirare-sott-acqua-2` (*water-breathing*), ecc.).

## Catalogo 2024: valori da correggere (SOLO LETTURA, nulla scritto)

«Livello attuale» è il testo del file di partenza `incantesimi_2024.json` che produce il livello mostrato in produzione; il database non è stato letto né scritto.

| id | nome | livello attuale (elenco) | valore corretto proposto | fonte della proposta |
|---|---|---|---|---|
| `dito-della-morte` | DITO DELLA MORTE | Necromanzia di livello (mago, stregone, warlock) | Necromanzia di 7º livello (mago, stregone, warlock) | SRD 5.2.1 — Dito della morte |
| `fabbricare` | FABBRICARE | Trasmutazione di 410° livello (mago) | Trasmutazione di 4º livello (mago) | SRD 5.2.1 — Fabbricare |
| `i-re-spirare-sott-acqua-2` | I'"RE" SPIRARE SOTT'ACQUA | Trasmutazione di livello (druido, mago, ranger, stregone) | Trasmutazione di 3º livello (druido, mago, ranger, stregone) | SRD 5.2.1 — Respirare sott'acqua |
| `imprigionare` | IMPRIGIONARE | Abiurazione di livello (mago, warlock) | Abiurazione di 9º livello (mago, warlock) | SRD 5.2.1 — Imprigionare |
| `inaridire` | INARIDIRE | Necromanzia di livello (druido, mago, stregone, warlock) | Necromanzia di 4º livello (druido, mago, stregone, warlock) | SRD 5.2.1 — Inaridire |
| `infliggi-ferite` | INFLIGGI FERITE | Necromanzia di livello (chierico) | Necromanzia di 1º livello (chierico) | SRD 5.2.1 — Infliggi ferite |
| `metamorfosi` | METAMORFOSI | Trasmutazione di livello (bardo, druido, mago, stregone) | Trasmutazione di 4º livello (bardo, druido, mago, stregone) | SRD 5.2.1 — Metamorfosi |
| `morte-apparente` | MORTE APPARENTE | Necromanzia di livello (bardo, chierico, druido, mago) | Necromanzia di 3° livello (bardo, chierico, druido, mago) | sintesi originale — Feign Death |
| `muro-prismatico` | MURO PRISMATICO | Abiurazione di livello (bardo, mago) | Abiurazione di 9º livello (bardo, mago) | SRD 5.2.1 — Muro prismatico |
| `parlare-con-i-morti` | PARLARE CON I MORTI | Necromanzia di livello (bardo, chierico, mago) | Necromanzia di 3º livello (bardo, chierico, mago) | SRD 5.2.1 — Parlare con i morti |
| `parola-del-potere-fortificare` | PAROLA DEL POTERE FORTIFICARE | Ammaliamento di livello (bardo, chierico) | Ammaliamento di 7° livello (bardo, chierico) | sintesi originale — Power Word Fortify |
| `parola-del-potere-guarire` | PAROLA DEL POTERE GUARIRE | Ammaliamento di livello (bardo, chierico) | Ammaliamento di 9º livello (bardo, chierico) | SRD 5.2.1 — Parola del potere guarire |
| `parola-del-potere-uccidere` | PAROLA DEL POTERE UCCIDERE | Ammaliamento di livello (bardo, mago, stregone, warlock) | Ammaliamento di 9º livello (bardo, mago, stregone, warlock) | SRD 5.2.1 — Parola del potere uccidere |
| `parola-guaritrice-di-massa` | PAROLA GUARITRICE DI MASSA | Abiurazione di livello (bardo, chierico) | Abiurazione di 3º livello (bardo, chierico) | SRD 5.2.1 — Parola guaritrice di massa |
| `passare-senza-tracce` | PASSARE SENZA TRACCE | Abiurazione di livello (druido, ranger) | Abiurazione di 2º livello (druido, ranger) | SRD 5.2.1 — Passare senza tracce |
| `pelle-coriacea` | PELLE CORIACEA | Trasmutazione di livello (druido, ranger) | Trasmutazione di 2º livello (druido, ranger) | SRD 5.2.1 — Pelle coriacea |
| `presenza-regale-di-yolande` | PRESENZA REGALE DI YOLANDE | Ammaliamento di livello (bardo, mago) | Ammaliamento di 5° livello (bardo, mago) | sintesi originale — Yolande's Regal Presence |
| `proibizione` | PROIBIZIONE | Abiurazione di livello (chierico) | Abiurazione di 6º livello (chierico) | SRD 5.2.1 — Proibizione |
| `proiezione-astrale` | PROIEZIONE ASTRALE | Necromanzia di livello (chierico, mago, warlock) | Necromanzia di 9º livello (chierico, mago, warlock) | SRD 5.2.1 — Proiezione astrale |
| `protezione-dai-veleni` | PROTEZIONE DAI VELENI | Abiurazione di livello (chierico, druido, paladino, ranger) | Abiurazione di 2º livello (chierico, druido, paladino, ranger) | SRD 5.2.1 — Protezione dai veleni |
| `punizione-demoralizzante` | PUNIZIONE DEMORALIZZANTE | Ammaliamento di livello (paladino) | Ammaliamento di 4° livello (paladino) | sintesi originale — Staggering Smite |
| `punizione-splendente` | PUNIZIONE SPLENDENTE | Trasmutazione di livello (paladino) | Trasmutazione di 2º livello (paladino) | SRD 5.2.1 — Punizione splendente |
| `raggio-di-affaticamento` | RAGGIO DI AFFATICAMENTO | Necromanzia di livello (mago, warlock) | Necromanzia di 2º livello (mago, warlock) | SRD 5.2.1 — Raggio di affaticamento |
| `raggio-di-infermita` | RAGGIO DI INFERMITÀ | Necromanzia di livello (mago, stregone) | Necromanzia di 1º livello (mago, stregone) | SRD 5.2.1 — Raggio di infermità |
| `reincarnazione` | REINCARNAZIONE | Necromanzia di livello (druido) | Necromanzia di 5º livello (druido) | SRD 5.2.1 — Reincarnazione |
| `resurrezione` | RESURREZIONE | Necromanzia di livello (bardo, chierico) | Necromanzia di 7º livello (bardo, chierico) | SRD 5.2.1 — Resurrezione |
| `resurrezione-pura` | RESURREZIONE PURA | Necromanzia di livello (chierico, druido) | Necromanzia di 9º livello (chierico, druido) | SRD 5.2.1 — Resurrezione pura |
| `rianimare-morti` | RIANIMARE MORTI | Necromanzia di livello (bardo, chierico, paladino) | Necromanzia di 5º livello (bardo, chierico, paladino) | SRD 5.2.1 — Rianimare morti |
| `richiama-non-morto` | RICHIAMA NON MORTO | Necromanzia di livello (mago, warlock) | Necromanzia di 3° livello (mago, warlock) | sintesi originale — Summon Undead |
| `rinascita` | RINASCITA | Necromanzia di livello (chierico, druido, paladino, ranger) | Necromanzia di 3º livello (chierico, druido, paladino, ranger) | SRD 5.2.1 — Rinascita |
| `riposo-inviolato` | RIPOSO INVIOLATO | Necromanzia di livello (chierico, mago, paladino) | Necromanzia di 2º livello (chierico, mago, paladino) | SRD 5.2.1 — Riposo inviolato |
| `risveglio` | RISVEGLIO | Trasmutazione di 58° livello (bardo, druido) | Trasmutazione di 5º livello (bardo, druido) | SRD 5.2.1 — Risveglio |
| `ritirata-rapida` | RITIRATA RAPIDA | Trasmutazione di livello (mago, stregone, warlock) | Trasmutazione di 1º livello (mago, stregone, warlock) | SRD 5.2.1 — Ritirata rapida |
| `santificare` | SANTIFICARE | Abiurazione di livello (chierico) | Abiurazione di 5º livello (chierico) | SRD 5.2.1 — Santificare |
| `scagliare-maledizione` | SCAGLIARE MALEDIZIONE | Necromanzia di livello (bardo, chierico, mago) | Necromanzia di 3º livello (bardo, chierico, mago) | SRD 5.2.1 — Scagliare maledizione |
| `sfera-elastica-di-0tiluke` | SFERA ELASTICA DI 0TILUKE | Abiurazione di livello (mago) | Abiurazione di 4º livello (mago) | SRD 5.2.1 — Sfera elastica |
| `sguardo-penetrante` | SGUARDO PENETRANTE | Necromanzia di livello (bardo, mago, stregone, warlock) | Necromanzia di 6º livello (bardo, mago, stregone, warlock) | SRD 5.2.1 — Sguardo penetrante |
| `simbolo` | SIMBOLO | Abiurazione di livello (bardo, chierico, druido, mago) | Abiurazione di 7º livello (bardo, chierico, druido, mago) | SRD 5.2.1 — Simbolo |
| `trucco-della-corda` | TRUCCO DELLA CORDA | Trasmutazione di livello (mago) | Trasmutazione di 2º livello (mago) | SRD 5.2.1 — Trucco della corda |
| `vigilanza-e-interdizione` | VIGILANZA E INTERDIZIONE | Abiurazione di livello (bardo, mago) | Abiurazione di 6º livello (bardo, mago) | SRD 5.2.1 — Vigilanza e interdizione |
| `vita-falsata` | VITA FALSATA | Necromanzia di livello (mago, stregone) | Necromanzia di 1º livello (mago, stregone) | SRD 5.2.1 — Vita falsata |
| `vuoto-mentale` | VUOTO MENTALE | Abiurazione di livello (bardo, mago) | Abiurazione di 8º livello (bardo, mago) | SRD 5.2.1 — Vuoto mentale |

| `veleni` | nome attuale: VELENI | proposto: INDIVIDUAZIONE DELLE MALATTIE E DEI VELENI | fonte SRD 5.2.1 — Individuazione delle malattie e dei veleni |
| `i-re-spirare-sott-acqua` | nome attuale: I-'"RE" SPIRARE SOTT'ACQUA | proposto: RESPIRARE SOTT'ACQUA | fonte SRD 5.2.1 — Respirare sott'acqua |
| `i-re-spirare-sott-acqua-2` | nome attuale: I'"RE" SPIRARE SOTT'ACQUA | proposto: RESPIRARE SOTT'ACQUA | fonte SRD 5.2.1 — Respirare sott'acqua |
