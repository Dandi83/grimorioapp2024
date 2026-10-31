# Ricerca anche per nome inglese ufficiale SRD (PROMPT 33, 31 ottobre 2026)

La ricerca (Home, Incantesimi, Bestiario, Oggetti magici; nella Home anche Classi e Condizioni) trova le schede SRD
anche con il nome ufficiale inglese, 2014 e 2024. Sotto il nome italiano compare «in inglese: Bless» solo quando la
scheda è stata trovata col nome inglese. Le schede non cambiano.

## Tabella

`lib/data/nomi-inglesi-srd.json`, chiave = id salvato della scheda, solo nomi (mai testo inglese). Letta solo sul
server (`lib/english-names.ts`); al browser arrivano i nomi dentro `/ricerca-indice.json` (campo `en`: nome →
riga) e negli elenchi delle sezioni (campo `en` delle righe).

Fonti, i PDF inglesi ufficiali (CC BY 4.0):

- 2014: SRD 5.1, `SRD_CC_v5.1.pdf`, sha256 `2504d2a0…a1f0`;
- 2024: SRD 5.2.1, `SRD_CC_v5.2.1.pdf`, sha256 `8974902d…3d87`.

Metodo, scheda per scheda (nessun nome indovinato dalla traduzione):

- **Incantesimi 2014**: campo `en` di `srd-spells-5.1-it.json`, con le maiuscole come stampate nel PDF 5.1.
- **Incantesimi 2024**: impronta livello + scuola + classi + componenti; a parità gittata (piedi × 0,3 = metri),
  durata, dadi. Un doppione unito (`merged-spell-ids.json`) tiene il nome sulla scheda conservata.
- **Mostri e animali**: impronta punti ferita + dadi + sei caratteristiche; a parità la CA.
- **Oggetti magici**: tipo + rarità + sintonia + numeri del testo (dadi, distanze convertite, bonus) e nomi degli
  incantesimi citati; poi lo stesso oggetto dell'altra edizione; i restanti controllati a mano nome per nome
  (sempre dentro lo stesso tipo e rarità).
- **Condizioni, classi, sottoclassi**: dal PDF.
- Controlli finali: un nome per una sola scheda, ogni nome presente alla lettera nel PDF della sua edizione (salvo
  a capo e trattini morbidi), nessun nome di proprietà intellettuale non SRD. Intestazioni in maiuscoletto spezzate
  nel PDF 5.2.1 corrette a mano: «Acid Splash», «Gray Ooze».

## Quanti nomi

| Tipo | 2014 | 2024 |
| --- | --- | --- |
| Incantesimi | 319 su 319 | 339 su 339 |
| Mostri e animali | 317 su 322 | 330 su 330 (235 + 95 animali) |
| Oggetti magici | 240 su 240 | 258 su 258 |
| Condizioni | 15 | 15 |
| Classi / sottoclassi | 12 / 12 | 12 / 12 |

Senza corrispondenza certa (restano senza nome inglese): 2014 `sciame-di-millepiedi`, `sciame-di-ragni`,
`sciame-di-scarabei`, `sciame-di-vespe` (varianti italiane del blocco «Swarm of Insects», senza titolo proprio nel
PDF) e `topo-gigante-contagioso` (variante «Diseased Giant Rats» del blocco «Giant Rat»). Non entrano per scelta:
le sintesi originali NO SRD (es. «Scheggia della mente»), homebrew, equipaggiamento.

## Regole

- Sinonimi dell'area riservata prima: un sinonimo scritto come un nome inglese toglie quel nome inglese
  dall'indice (`withSynonyms`).
- «Ricerche senza risultato»: una parola che ora trova una scheda col nome inglese esce dall'elenco
  (`foundInEnglish`), anche per le ricerche fatte prima del rilascio.
- Controlli: `tests/english-names.cjs` (campione di almeno 30 nomi per tipo ed edizione controllati a mano, solo
  schede SRD, nessun doppione), `e2e/nomi-inglesi.spec.mjs` (390 e 1280, 2014 e 2024).

## PROMPT 35 (31 ottobre 2026): evidenziazione ed equipaggiamento

- La riga «in inglese» evidenzia le lettere trovate con lo stesso componente del nome italiano della Home
  (`components/search/marked.tsx`): stesse corrispondenze (`matchName`), maiuscole, accenti, ricerca tollerante
  (con un errore di battitura la voce è trovata ma nulla è evidenziato, come per l'italiano). Le posizioni sono
  calcolate sul nome «cercato» e riportate sul nome scritto (`lib/highlight.ts`: «Thieves’ Tools»).
- La riga compare quando la ricerca trova il nome inglese, anche se trova pure quello italiano (evidenziati
  entrambi); non compare per nomi uguali nelle due lingue («Lich») né per un errore di battitura sul nome inglese se
  l'italiano è trovato senza errori. Nella Home, per una voce delle due edizioni, prima il nome inglese dell'edizione
  scelta.
- Equipaggiamento: armi, armature, oggetti d'avventura e strumenti abbinati riga per riga alle tabelle dei PDF
  (costo, peso, danni coincidenti). 2014: 37 + 13 + 94 + 35 = 179; 2024: 38 + 13 + 81 + 25 = 157. Nessuna voce senza
  corrispondenza. Cavalcature e veicoli non hanno schede nel sito: nessun nome.

## PROMPT 36 (31 ottobre 2026): ricerca negli elenchi Armi e Armature

- Campo di ricerca in /equipaggiamento/armi e /equipaggiamento/armature: lo stesso componente di Oggetti d'avventura e
  Strumenti (`components/equipment/list-search.tsx`, ora usato da tutti e quattro), segnaposto «Cerca per nome…».
- Nome italiano e inglese, ricerca tollerante, nome italiano evidenziato (`components/equipment/found-name.tsx`) e
  riga «in inglese» evidenziata; gruppi vuoti nascosti, conteggio «N armi trovate», «Nessuna arma con questo nome.»,
  «Forse cercavi». La ricerca non resta salvata tornando indietro, come negli altri elenchi dell'equipaggiamento.
- Evento «search» con area «armi» / «armature» (Approfondimenti).
- I nomi inglesi arrivano alle pagine dal server (`app/equipaggiamento/armi|armature/page.tsx`).

## PROMPT 37 (31 ottobre 2026): nomi inglesi «solo ricerca» delle schede NO SRD

- Proposte: `lib/data/nomi-inglesi-proposte.json`, dal nome del manuale (`sourceName`) delle 53 sintesi originali:
  50 proposte, 3 vuote (Hunger of Hadar, Arms of Hadar, Armor of Agathys: senza il nome proprio non resta un nome
  utile). Per Tasha's Bubbling Cauldron, Yolande's Regal Presence e Jallarzi's Storm of Radiance solo la parte non
  protetta. Nessuna proposta per i mostri (nessun mostro NO SRD nei file del progetto) né per le schede «Aggiunta da
  te» (si scrivono a mano nell'editor).
- Decisioni nella tabella `grimorio_search_english` (approvata / scartata). /admin/contenuti → «Nomi inglesi da
  verificare»: Approva, Modifica (salva e approva), Scarta; gli approvati si possono cambiare o scartare.
- Editor di incantesimi e mostri NO SRD: campo «Nome inglese (solo ricerca)», salvato con la scheda.
- Nomi protetti (`lib/search-english.ts`): l'elenco di «Nomi da rivedere» più Jallarzi, Yuan-ti, Displacer Beast,
  Carrion Crawler, Umber Hulk, Kenku, Slaad, Neogi, Kuo-toa; il salvataggio viene rifiutato con un messaggio.
- Indice: campo `k` con la sola chiave normalizzata (`synaptic static`), mai mostrata; sinonimi admin prima; una
  parola trovata così esce da «Ricerche senza risultato». Solo nella ricerca della Home: gli elenchi delle sezioni
  non ricevono la chiave (il nome inglese non deve comparire nel loro HTML).
