# PROMPT 8 — 28 ottobre 2026: 4 incantesimi NO SRD, «Sfera elastica/congelante», indirizzi senza nomi propri

## 1. Quattro schede nuove (sintesi originali, NO SRD)

Stesso metodo delle 49 sintesi: testo originale in `lib/data/original-descriptions-2024.json`, scheda segnata «NO SRD / Sintesi originale».
Differenza: queste quattro non hanno una riga nel database. Il sito le legge dal file (come le 20 aggiunte SRD di `lib/srd-additions.ts`),
quindi **nessuna scrittura nel database di produzione**. Il primo salvataggio dall'area riservata crea la riga.

| Indirizzo | Nome mostrato | Edizione | Livello | Parole |
|---|---|---|---|---|
| `/spell/manto-del-crociato-2014` | Manto del crociato | 2014 | Invocazione 3° (paladino) | 62 |
| `/spell/punizione-accecante-2024` | Punizione accecante | 2024 | Invocazione 3° (paladino) | 62 |
| `/spell/tempesta-radiosa` | Tempesta radiosa | 2024 | Invocazione 5° (mago, warlock) | 99 |
| `/spell/rombo-di-tuono` | Rombo di tuono | 2024 | Trucchetto di Invocazione (bardo, druido, mago, stregone, warlock) | 66 |

Conteggi attesi: 2014 = 360 + 1 = **361**, 2024 = 388 + 3 = **391**.

## 2. Nomi mostrati senza «Otiluke»

Solo visualizzazione (`lib/spell-name.ts`): il nome salvato resta «SFERA ELASTICA DI 0TILUKE» / «SFERA CONGELANTE DI 0TILUKE»,
il sito mostra «Sfera elastica» e «Sfera congelante». Gli altri nomi visibili erano già generici o scelti da Daniele (Agata, Ada, Ash, Iolanda).

## 3. Indirizzi senza nomi propri (308)

Elenco in `lib/data/public-spell-ids.json`. Le righe del database, i preferiti salvati, le statistiche e l'area riservata tengono
l'identificativo salvato; cambia solo l'indirizzo pubblico. I vecchi indirizzi rispondono 308 (`next.config.mjs`).

| Vecchio indirizzo | Nuovo indirizzo |
|---|---|
| /spell/armatura-di-agathis | /spell/armatura-di-agata-2014 |
| /spell/armatura-di-agathys | /spell/armatura-di-agata |
| /spell/aura-magica-di-nystul | /spell/aura-magica-dell-arcanista |
| /spell/braccia-di-hadar-2 | /spell/braccia-di-ada-2014 |
| /spell/braccia-di-hadar | /spell/braccia-di-ada |
| /spell/calderone-ribollente-di-tasha | /spell/calderone-ribollente-di-ash |
| /spell/capanna-di-leomund | /spell/capanna |
| /spell/disco-fluttuante-di-tenser | /spell/disco-fluttuante |
| /spell/evocazioni-istantanee-di-drawmij | /spell/evocazioni-istantanee |
| /spell/fame-di-hadar-2 | /spell/fame-di-ada-2014 |
| /spell/fame-di-hadar | /spell/fame-di-ada |
| /spell/freccia-acida-di-melf | /spell/freccia-acida |
| /spell/i-re-spirare-sott-acqua-2 | /spell/respirare-sott-acqua |
| /spell/i-re-spirare-sott-acqua (doppione unito) | /spell/respirare-sott-acqua |
| /spell/legame-telepatico-di-rary | /spell/legame-telepatico |
| /spell/mano-di-bigby | /spell/mano-arcana |
| /spell/presenza-regale-di-yolande | /spell/presenza-regale-di-iolanda |
| /spell/reggia-meravigliosa-di-mordenkainen | /spell/reggia-meravigliosa |
| /spell/risata-incontenibile-di-tasha | /spell/risata-incontenibile |
| /spell/santuario-privato-di-mordenkainen | /spell/santuario-privato |
| /spell/scrigno-segreto-di-leomund | /spell/scrigno-segreto |
| /spell/segugio-fedele-di-mordenkainen | /spell/segugio-fedele |
| /spell/sfera-congelante-di-0tiluke | /spell/sfera-congelante |
| /spell/sfera-elastica-di-0tiluke | /spell/sfera-elastica |
| /spell/spada-di-mordenkainen | /spell/spada-arcana |
| /spell/tentacoli-neri-di-evard | /spell/tentacoli-neri |
| /spell/veleni | /spell/individuazione-delle-malattie-e-dei-veleni |

Aggiornati: tutti i link interni (`spellHref`), l'indice di ricerca, i link dei preferiti, il canonico e la condivisione delle schede,
le schede nascoste con l'occhio (stesso indirizzo pubblico), i nomi nelle segnalazioni, le letture nelle statistiche (vecchio e nuovo
indirizzo si sommano sulla stessa scheda). Il sito non ha una sitemap (`/sitemap.xml` risponde 404 e le pagine sono `noindex`): niente da aggiornare.
Nessun mostro ha nomi propri nell'indirizzo.

## 4. Sintesi riscritte

Le sintesi riscritte sostituiscono il testo nel database solo se è identico a quello precedente (hash in `revisions`); una modifica
fatta dall'area riservata resta com'è.

- 8 «Richiama…» (aberrazione, bestia, celestiale, costrutto, elementale, folletto, immondo, non morto): introduzione nuova e
  paragrafo comune riscritto (era quasi una parafrasi del manuale). Tolti i nomi non SRD e i nomi inglesi delle varianti, anche nelle
  statistiche degli spiriti: Beholderkin → Occhiuto, Mind Flayer → Tentacolato, Slaad → Rigenerante, Yugoloth → Mercenario;
  via «(Avenger)», «(Defender)», «(Fuming)», «(Mirthful)», «(Tricksy)», «(Ghostly)», «(Putrid)», «(Skeletal)».
- 1 «Punizione…»: Punizione esiliante («semipiano innocuo» e la frase del ritorno erano troppo vicine al manuale).
- Punizione collerica, demoralizzante e tonante: sintesi brevi delle sole regole, con frasi proprie: lasciate invariate.
  La quinta, Punizione accecante (2024), è nuova e scritta da zero.
