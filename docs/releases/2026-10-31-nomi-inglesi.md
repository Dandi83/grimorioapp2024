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
