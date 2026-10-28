# Controllo incantesimi: Manuale del Giocatore 2014 e 2024 contro Il Grimorio.App (28 ottobre 2026)

Solo controllo: nessun dato modificato, niente salvato in produzione. Letti solo dati pubblici
(`https://ilgrimorio.app/api/catalogo/incantesimi`, 748 voci) e i file del repository. Per il confronto
sono stati usati solo NOMI, livello, scuola e classi: nessun testo dei manuali è copiato qui.

## Fonti degli elenchi PHB

- PHB 2014: indice degli incantesimi di 5etools (`5etools-mirror-3/5etools-src`, `data/spells/spells-phb.json`), solo nome, livello, scuola e SRD sì/no.
- PHB 2024: stesso progetto, `data/spells/spells-xphb.json`.
- Classi: `data/generated/gendata-spell-source-lookup.json` dello stesso progetto, limitato a PHB e XPHB.
- Appartenenza all'SRD verificata sui conteggi noti: SRD 5.1 = 319 incantesimi, SRD 5.2.1 = 339.

Totali: PHB 2014 = **361** incantesimi, PHB 2024 = **391**. Rinominati nel 2024: Feeblemind → Befuddlement,
Branding Smite → Shining Smite. Nuovi nel 2024 rispetto al 2014: 30. Nessun incantesimo 2014 tolto nel 2024.

## Riepilogo per edizione

| Edizione | PHB | Nell'app | di cui SRD | di cui NO SRD | Mancanti | Extra non PHB | Nascosti |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2014 | 361 | 360 | 319 | 41 | **1** | 0 | 0 visibili dai dati pubblici (vedi nota) |
| 2024 | 391 | 388 | 339 | 49 | **3** | 0 | 0 visibili dai dati pubblici (vedi nota) |

Abbinamento EN↔IT fatto sui nomi SRD italiani, sulla tabella dei nomi cambiati 2014→2024 dell'app
(`lib/data/spell-edition-links.json`) e sulle scelte di Daniele per i nomi propri (Agata, Ada, Ash, Iolanda).

### Mancanti

| Edizione | Nome EN | Livello | Scuola | SRD |
|---|---|---|---|---|
| 2014 | Crusader's Mantle | 3 | Invocazione (Evocation) | no |
| 2024 | Blinding Smite | 3 | Invocazione (Evocation) | no |
| 2024 | Jallarzi's Storm of Radiance | 5 | Invocazione (Evocation) | no |
| 2024 | Thunderclap | 0 (trucchetto) | Invocazione (Evocation) | no |

Tutti e quattro sono NO SRD: vanno scritti come schede nostre (dati di gioco più sintesi originale), con un nome
senza nomi propri (es. «Tempesta di radiosità» senza «Jallarzi»).

### Nascosti

Lo stato «nascosto» delle schede sta nel database e non è leggibile dai dati pubblici. Dai file del repository e
dal catalogo pubblico risulta non pubblico solo il doppione già unito `i-re-spirare-sott-acqua` (nome nei dati:
«I-'"RE" SPIRARE SOTT'ACQUA»). Per un elenco certo serve un controllo dall'area riservata.

## Liste per classe

Confronto classe per classe tra PHB e app: **0 differenze** nel 2014 e **0 differenze** nel 2024
(tenendo conto che nel 2024 il Monaco non ha più Proiezione astrale).

| Classe | PHB 2014 | PHB 2024 | Differenza |
|---|---:|---:|---:|
| Bardo | 120 | 140 | +20 |
| Chierico | 106 | 117 | +11 |
| Druido | 110 | 135 | +25 |
| Paladino | 45 | 51 | +6 |
| Ranger | 46 | 61 | +15 |
| Stregone | 129 | 150 | +21 |
| Warlock | 74 | 91 | +17 |
| Mago | 215 | 242 | +27 |

(I conteggi includono gli incantesimi mancanti nell'app. Le liste per classe dell'app coincidono con il PHB per
tutti gli incantesimi presenti.)

## Schede NO SRD 2024 (49)

Fonte: `lib/data/original-descriptions-2024.json` (tipo testo «original-rules-summary»).

- Dati di gioco: tutte e 49 hanno livello con scuola e classi, tempo di lancio, gittata, componenti e durata. **Nessun campo vuoto.**
- Sintesi: lunghezza media 79 parole, quindi riassunti e non trascrizioni integrali. Nessuna ha 10 o più parole consecutive
  uguali al testo SRD 5.1 italiano dello stesso incantesimo, dove esiste.
- Limite del controllo: il testo ufficiale del PHB 2024 non è disponibile e non va copiato, quindi la vicinanza
  al testo ufficiale 2024 **non è verificabile** in automatico. Da rileggere a campione (consigliati: le 8
  «Richiama …», le 5 «Punizione …» e «Parola radiosa», le più tecniche).
- Nomi: i nomi visibili usano già i nomi scelti da Daniele (Agata, Ada, Ash, Iolanda). Restano nomi propri
  negli **indirizzi delle schede**, visibili nei link condivisi: `fame-di-hadar`, `braccia-di-hadar`,
  `armatura-di-agathys`, `calderone-ribollente-di-tasha`, `presenza-regale-di-yolande` (e varianti 2014 con «-2»).

## Altre cose da segnalare

1. «SFERA ELASTICA DI 0TILUKE» e «SFERA CONGELANTE DI 0TILUKE» (2024, SRD): il nome con lo zero e il nome proprio
   viene dal titolo stampato nell'SRD 5.2.1 italiano, mentre le liste per classe dello stesso SRD dicono
   «Sfera elastica» e «Sfera congelante». L'app mostra «Otiluke» (`lib/spell-name.ts`). Va scelto se mostrare il nome
   delle liste per classe (senza nome proprio) lasciando invariato il testo SRD.
2. Sfera infuocata 2024: l'SRD 5.2.1 italiano stampa «Evocazione» (che in italiano corrisponde a Conjuration),
   mentre il PHB 2024 inglese la indica come Evocation (in italiano «Invocazione»). Probabile svista della traduzione
   ufficiale: il testo SRD resta com'è, ma il filtro per scuola la classifica come Evocazione.
3. Id insoliti: `veleni` (Individuazione delle malattie e dei veleni) e `i-re-spirare-sott-acqua-2`.
4. Nel 2024 molti id contengono ancora nomi propri (`tenser`, `mordenkainen`, …), anche se i nomi visibili sono generici.

## Proposta (non eseguita)

- **Completare il 2024**: 3 schede NO SRD (Blinding Smite, Jallarzi's Storm of Radiance, Thunderclap) aggiunte a
  `lib/data/original-descriptions-2024.json` e al catalogo 2024, con le classi corrette. Più 1 scheda 2014
  (Crusader's Mantle) nel catalogo 2014.
- **Come scrivere le sintesi**: stesse regole delle 49 esistenti. Meccanica descritta con parole nostre, 60–100
  parole, nessuna frase del manuale, numeri di gioco (danni, CD, aree) riportati come dati, nome senza nomi propri o marchi.
- **Il metodo va bene anche per il 2024?** Sì. È già usato per le 49 schede 2024: file di sintesi originali, bollino
  NO SRD, «Sintesi originale» nel riquadro di provenienza, nessuna licenza CC-BY dichiarata.
- **Stima**: circa mezza giornata di lavoro per le 4 schede (dati, sintesi, prove, revisione). In più, se approvati:
  il nome «Sfera elastica/congelante» senza Otiluke (un'ora) e gli alias degli indirizzi senza nomi propri con
  reindirizzamento dai vecchi (mezza giornata, per non rompere i link già condivisi).
