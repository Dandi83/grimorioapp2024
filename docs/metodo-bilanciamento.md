# Come valutiamo il bilanciamento

Documento del metodo del Bilanciamento (PROMPT 19, 29 ottobre 2026). La pagina pubblica /bestiario/creati-da-voi/bilanciamento e questo documento dicono la stessa cosa: i testi vengono da `lib/balance-method.ts` e `tests/balance-method.cjs` controlla che qui ci siano tutti. Sotto, in più, i dettagli tecnici.

## In breve

Ogni creatura di «I mostri creati da voi» passa da un controllo prima di essere pubblicata: la mettiamo alla prova contro un gruppo di personaggi e la confrontiamo con i mostri ufficiali dello stesso Grado di sfida (GS). Ecco come funziona, senza segreti. La pillola «✓ Bilanciamento verificato» compare sulle schede che restano nella norma con tutti e tre i modi di giocarle.

### 1. I numeri di base

Leggiamo la scheda come la leggerebbe un master: Classe Armatura, punti ferita, tiri salvezza, attacchi e danni, capacità a ricarica, azioni leggendarie, resistenze e rigenerazione. Poi confrontiamo Classe Armatura, bonus per colpire e CD con quelli dei mostri ufficiali dello stesso GS.

### 2. Migliaia di combattimenti

La creatura affronta 3.000 volte, per ogni modo di giocarla, un gruppo di riferimento di 4 personaggi (guerriero, chierico, ladro e mago) di livello pari al suo GS, da 1 a 20. Misuriamo i danni che fa a ogni round, quanti round resiste e quanto spesso un personaggio finisce a terra. Facciamo lo stesso con i mostri ufficiali dell’SRD (5.1 per il 2014, 5.2.1 con gli animali per il 2024): la creatura è «in linea» se cade nella fascia dove si trovano 8 mostri ufficiali su 10 del suo GS.

### 3. Tre modi di giocarlo

Un mostro deve restare del suo GS qualunque scelta faccia il master. Lo proviamo con 3 stili: ottimale (sceglie sempre la mossa che fa più danni), a caso (sceglie a caso tra le azioni disponibili) e prudente (preferisce il multiattacco e usa le capacità a ricarica una volta su due). Il giudizio guarda lo stile in cui va peggio.

### 4. Gruppi diversi e controlli extra

Lo mettiamo alla prova anche in 7 situazioni: gruppi di 3, 5 e 6 personaggi, personaggi di un livello in meno o in più, un gruppo tutto armi e uno tutto magia. Queste prove non cambiano il giudizio, ma ci avvisano se il mostro stermina il gruppo, resiste o vince molto più dei mostri ufficiali. Controlliamo poi cose che il GS non misura: condizioni che bloccano un personaggio senza un nuovo tiro salvezza, colpi che abbattono un personaggio in un solo turno, mostri forti senza abbastanza azioni per stare da soli, difese che lasciano poche contromosse e numeri fuori scala.

### 5. La prova del tavolo

La simulazione è solo l’inizio. In fondo a ogni scheda chi l’ha giocata può dirci se è stata troppo facile, giusta o troppo difficile rispetto al suo GS. Dopo 5 prove mostriamo il conteggio, e confrontiamo i voti dei master con il giudizio del simulatore.

## Cosa il simulatore non sa fare

- Posizioni, coperture e terreno: il combattimento è senza mappa.
- Gli incantesimi di controllo dei personaggi, che bloccano, rallentano o allontanano il mostro.
- Gli oggetti magici e le tattiche furbe dei giocatori.
- Il vostro gruppo: quello del simulatore è un modello, il vostro tavolo è diverso.

**È una stima seria, non una garanzia. Il giudizio finale resta al master, e al tavolo.**

Hai trovato un errore nel metodo o in una scheda? Scrivici da Info → Segnala un problema.

## Per chi vuole i dettagli

### Il gruppo di riferimento

Guerriero / chierico / ladro / mago, livello pari al GS (arrotondato, da 1 a 20).

| Liv. | CA | PF | Attacchi del guerriero | Danni | CD |
|---|---|---|---|---|---|
| 1 | 18 / 18 / 14 / 15 | 12 / 10 / 10 / 8 | 1 × +5 | guerriero 2d6 + 3; ladro 1d8 + 3 + 1d6; mago 1d10 | 13 |
| 2 | 18 / 18 / 14 / 15 | 20 / 17 / 17 / 14 | 1 × +5 | guerriero 2d6 + 3; ladro 1d8 + 3 + 1d6; mago 1d10 | 13 |
| 3 | 18 / 18 / 14 / 15 | 28 / 24 / 24 / 20 | 1 × +5 | guerriero 2d6 + 3; ladro 1d8 + 3 + 2d6; mago 1d10 | 13 |
| 4 | 18 / 18 / 14 / 15 | 36 / 31 / 31 / 26 | 1 × +6 | guerriero 2d6 + 4; ladro 1d8 + 4 + 2d6; mago 1d10 | 14 |
| 5 | 19 / 19 / 15 / 15 | 44 / 38 / 38 / 32 | 2 × +7 | guerriero 2d6 + 4; ladro 1d8 + 4 + 3d6; mago 2d10; chierico 3d8 ad area | 15 |
| 6 | 19 / 19 / 15 / 15 | 52 / 45 / 45 / 38 | 2 × +7 | guerriero 2d6 + 4; ladro 1d8 + 4 + 3d6; mago 2d10; chierico 3d8 ad area | 15 |
| 7 | 19 / 19 / 15 / 15 | 60 / 52 / 52 / 44 | 2 × +7 | guerriero 2d6 + 4; ladro 1d8 + 4 + 4d6; mago 2d10; chierico 3d8 ad area | 15 |
| 8 | 19 / 19 / 15 / 15 | 68 / 59 / 59 / 50 | 2 × +8 | guerriero 2d6 + 5; ladro 1d8 + 5 + 4d6; mago 2d10; chierico 3d8 ad area | 16 |
| 9 | 19 / 19 / 15 / 15 | 76 / 66 / 66 / 56 | 2 × +9 | guerriero 2d6 + 5; ladro 1d8 + 5 + 5d6; mago 2d10; chierico 4d8 ad area | 17 |
| 10 | 20 / 20 / 16 / 15 | 84 / 73 / 73 / 62 | 2 × +10 | guerriero 2d6 + 6; ladro 1d8 + 5 + 5d6; mago 2d10; chierico 4d8 ad area | 17 |
| 11 | 20 / 20 / 16 / 15 | 92 / 80 / 80 / 68 | 3 × +10 | guerriero 2d6 + 6; ladro 1d8 + 5 + 6d6; mago 3d10; chierico 4d8 ad area | 17 |
| 12 | 20 / 20 / 16 / 15 | 100 / 87 / 87 / 74 | 3 × +10 | guerriero 2d6 + 6; ladro 1d8 + 5 + 6d6; mago 3d10; chierico 4d8 ad area | 17 |
| 13 | 20 / 20 / 16 / 15 | 108 / 94 / 94 / 80 | 3 × +11 | guerriero 2d6 + 6; ladro 1d8 + 5 + 7d6; mago 3d10; chierico 5d8 ad area | 18 |
| 14 | 20 / 20 / 16 / 15 | 116 / 101 / 101 / 86 | 3 × +11 | guerriero 2d6 + 6; ladro 1d8 + 5 + 7d6; mago 3d10; chierico 5d8 ad area | 18 |
| 15 | 20 / 20 / 16 / 15 | 124 / 108 / 108 / 92 | 3 × +11 | guerriero 2d6 + 6; ladro 1d8 + 5 + 8d6; mago 3d10; chierico 5d8 ad area | 18 |
| 16 | 20 / 20 / 16 / 15 | 132 / 115 / 115 / 98 | 3 × +11 | guerriero 2d6 + 6; ladro 1d8 + 5 + 8d6; mago 3d10; chierico 5d8 ad area | 18 |
| 17 | 20 / 20 / 16 / 15 | 140 / 122 / 122 / 104 | 3 × +12 | guerriero 2d6 + 6; ladro 1d8 + 5 + 9d6; mago 4d10; chierico 5d8 ad area | 19 |
| 18 | 20 / 20 / 16 / 15 | 148 / 129 / 129 / 110 | 3 × +12 | guerriero 2d6 + 6; ladro 1d8 + 5 + 9d6; mago 4d10; chierico 5d8 ad area | 19 |
| 19 | 20 / 20 / 16 / 15 | 156 / 136 / 136 / 116 | 3 × +12 | guerriero 2d6 + 6; ladro 1d8 + 5 + 10d6; mago 4d10; chierico 5d8 ad area | 19 |
| 20 | 20 / 20 / 16 / 15 | 164 / 143 / 143 / 122 | 4 × +12 | guerriero 2d6 + 6; ladro 1d8 + 5 + 10d6; mago 4d10; chierico 5d8 ad area | 19 |

### Le soglie

- In linea: danni a round e round di resistenza dentro la fascia dal 10° al 90° percentile dei mostri ufficiali dello stesso GS, con tutti e tre i modi di giocarlo.
- Da controllare: nello stile peggiore una sola misura fuori dalla fascia, di non più del 25%.
- Fuori dal GS: tutte e due le misure fuori, o una fuori di più del 25%.
- Gruppo di confronto: almeno 6 mostri ufficiali dello stesso GS e della stessa edizione; se sono meno, si aggiungono quelli dei GS vicini.
- Combattimenti: 3.000 per ogni modo di giocare e 300 per ogni situazione di prova; 800 per ogni modo di giocare dei mostri ufficiali, sempre con lo stesso seme, così il calcolo dà sempre lo stesso risultato.
- Situazioni di prova: un avviso quando la creatura stermina il gruppo o resiste più del 90° percentile dei mostri ufficiali nella stessa situazione, o quando i personaggi vincono meno del 10° percentile.

### Gli avvisi

- Controllo pesante: paralizzato, pietrificato, stordito, privo di sensi o incapacitato per più di un turno senza poter ripetere il tiro salvezza; più forte a GS 4 o meno.
- In un colpo solo: un personaggio passa da punti ferita pieni a 0 in un solo turno del mostro (azioni leggendarie comprese) più spesso del 90° percentile dei mostri ufficiali.
- Economia d’azione: GS 5 o più senza multiattacco, senza azioni bonus e senza azioni leggendarie, quindi da solo rischia di essere sopraffatto.
- Poche contromosse: resistenza ai danni contundenti, perforanti e taglienti a GS 8 o meno; immunità a 6 condizioni o più; resistenza alla magia insieme alle resistenze leggendarie a GS 10 o meno.
- Numeri fuori scala: Classe Armatura, bonus per colpire o CD fuori dalla fascia dei mostri ufficiali dello stesso GS, con il valore tipico.

## Dettagli tecnici

- Codice: `lib/monster-balance/` (lettura della scheda `parse.ts`, gruppo `party.ts`, combattimenti `simulate.ts`, situazioni di prova `scenarios.ts`, confronto `compare.ts`, avvisi `checks.ts`, riquadro `index.ts`). Tutto solo lato server.
- Combattimenti di una scheda: 3.000 per ciascuno dei 3 modi di giocare nel gruppo di riferimento e 300 per ciascuna delle 7 situazioni di prova (tattica ottimale): 11.100 in tutto.
- Mostri ufficiali: `scripts/build-monster-balance.mjs` calcola 800 combattimenti per ogni modo di giocare e 300 per ogni situazione di prova per ogni mostro SRD 5.1 (2014) e SRD 5.2.1 con gli animali (2024), e li salva in `lib/data/monster-balance-srd.json` (solo server). La CI esegue lo script con `--check`: il file deve essere quello che lo script produce.
- Seme fisso (20261029): lo stesso foglio dà sempre lo stesso risultato. I risultati restano in memoria per versione della scheda (stessi campi, stessa edizione): una scheda si ricalcola solo quando cambia.
- Modi di giocare: «ottimale» sceglie l’azione con più danni attesi (le capacità con tiro salvezza quando valgono almeno l’80% del multiattacco) e la migliore azione leggendaria; «a caso» sceglie a caso tra multiattacco e capacità pronte, e tra le azioni leggendarie pagabili; «prudente» fa il multiattacco e usa una capacità a ricarica pronta una volta su due, azioni leggendarie a caso.
- Situazioni di prova: Gruppo di 3 PG (senza mago); Gruppo di 5 PG (un guerriero in più); Gruppo di 6 PG (guerriero e chierico in più); PG di un livello in meno; PG di un livello in più; Gruppo marziale (guerriero, guerriero, ladro, chierico); Gruppo arcano (mago, mago, chierico, ladro).
- Misure: danni ai PG per round (mai oltre 0 punti ferita), round di resistenza (al massimo 15), PG a terra (% dei combattimenti con almeno un PG a 0), gruppo sterminato, vittorie dei PG, PG abbattuto in un turno (da punti ferita pieni a 0 tra l’inizio del turno del mostro e il turno successivo).
- Giudizio: per ogni modo di giocare si confrontano danni e round con la fascia 10°–90° dei mostri SRD con lo stesso modo di giocare; il giudizio è quello del modo peggiore, e la frase dice quale modo e quale misura.
- Pubblico: solo la pillola «✓ Bilanciamento verificato» (giudizio «In linea» salvato all’approvazione, casella attiva) e questa pagina del metodo. Numeri, giudizi e avvisi restano nell’area riservata (/admin/bilanciamento, riquadro sotto le schede, anteprima delle proposte).
- «L’hai provato al tavolo?»: un voto per dispositivo e per scheda, modificabile, con le stesse regole delle statistiche (niente dopo «No», mai dai dispositivi dell’amministratore, limiti antispam), tabella `grimorio_table_votes` (chiave cifrata del visitatore, mai l’identificativo); il conteggio pubblico compare da 5 voti; i voti si cancellano con la scheda.
