# Scheda TPK v1 con il campo «ed» (PROMPT 71, 6 novembre 2026)

Total Party Kill (TPK) ha aggiornato il file condiviso «Scheda TPK v1» (PROMPT 38 di TPK): campo facoltativo `"ed": "2024" | "2014"` e rifiuto dei personaggi 2014. Il Grimorio ricopia il file e si adegua nella pagina beta «I miei personaggi» (solo admin).

## File copiati da TPK
- Origine: `Dandi83/total-party-kill`, main al commit `4bf6756f487e11d8978b8c1a1f3047365e4ce09d`.
- `src/shared/scheda-tpk-v1.ts` → `lib/shared/scheda-tpk-v1.ts`, identico byte per byte. SHA-256 `9fc41853264b3c8984033d6e0eb91824e5941a2d723a8f3e46f5042bbde25130`, uguale a quello indicato da Daniele.
- `tests/scheda-tpk-v1.test.ts` → `tests/scheda-tpk-v1.test.ts`, cambia solo il percorso dell'import. SHA-256 originale `79cae58fb793a38ac633cc872adc759ad49ffca0ed270cf6739d39a7da1a4066`, uguale a quello atteso.
- Aggiornati `lib/shared/README.md` (commit e SHA-256) e lo SHA-256 in `tests/scheda-tpk-grimorio.cjs`. I controlli sugli id del PROMPT 61 (classi, sottoclassi, talenti, abilità, tabella degli indirizzi degli incantesimi, incantesimi di Brenna) restano verdi.

## «Gioca in Total Party Kill»
- `sheetForTpk` (`lib/characters-beta.ts`): prima di `encodePg`, se `"ed"` manca si aggiunge `"ed": "2024"` su una copia. Vale anche per i PG salvati prima, come Brenna. Il PG salvato nel browser non viene riscritto.
- Un PG con `"ed": "2024"` va così com'è.
- Un PG 2014 non ha il pulsante. Al suo posto c'è la nota «Total Party Kill usa le regole 2024» (`data-play-note`). Conta come 2014 se ha `"ed": "2014"` o un altro segno certo del file condiviso (`segni2014`: incantesimi «-2014», specie o sottorazze del 2014), perché TPK rifiuterebbe anche quelli.
- «🔗 Copia il link» (indirizzo del Grimorio) porta il PG com'è salvato, senza aggiungere `"ed"`.
- `lib/tpk.ts` non cambia in questa PR. Con il PROMPT 70 il link è `https://www.totalpartykill.app/importa?da=grimorio#pg=…`: `da=grimorio` sta tra i parametri, il `#pg=` viene dopo e contiene il PG con `"ed": "2024"`. Il branch è stato aggiornato da main dopo i PROMPT 69 e 70; le prove controllano entrambi.

## Ricezione da TPK (#pg=, #party=)
- Si accettano PG con o senza `"ed"`.
- `decodeHash` del file condiviso rifiuta i PG 2014 (`edizione2014`, dati in `grezzi`). `incomingFromLink` li controlla con `validaScheda`: se i campi sono validi, il PG si riceve, si salva e si consulta. L'anteprima mostra l'avviso «Personaggio con regole 2014: in Total Party Kill non si può usare» (`data-edition-2014`). Nei «Controlli» la prima spunta diventa «Campi validi, regole 2014», in rosso.
- Un PG 2014 con campi non validi resta un «Link non valido», con gli errori per campo.

## Prove
- `tests/personaggi-beta.cjs`:
  - Brenna, che non ha `"ed"`: il link verso TPK si decodifica con `"ed": "2024"` e il resto è uguale;
  - `"ed": "2024"` resta invariato; `"ed": "2014"` o un incantesimo «-2014» non danno link;
  - ricezione di PG 2014, di un party misto e di un 2014 non valido.
- `tests/scheda-tpk-v1.test.ts`: il test di TPK, 25 prove verdi.
- `e2e/personaggi-beta.spec.mjs`:
  - su iPhone 390, Android 412 e computer 1280 il link «Gioca» di Brenna contiene `"ed": "2024"` e quello salvato no;
  - nuova prova: PG 2014 con avviso, salvato, senza pulsante e con la nota; PG con `"ed": "2024"` mandato identico.

## Bundle
Cambia solo il chunk di /personaggi: 45.105 → 47.323 byte, gzip 16.171 → 16.821 byte (+650 byte). Tutti gli altri chunk sono identici.
