# PROMPT 46 — Calcolo veloce del GS: le azioni con Ricarica non si moltiplicano (1 novembre 2026)

## Regola
- `damagePerRound` (lib/homebrew-cr.ts): un'azione con «Ricarica» o «N/giorno» nel nome non è mai l'attacco che il Multiattacco ripete. «N attacchi» vale N × il miglior attacco senza Ricarica né usi limitati; «N attacchi, scegliendo in qualsiasi combinazione tra X e Y» vale N × il più forte tra X e Y.
- Se il Multiattacco la nomina («può sostituire uno di questi attacchi con …»): + (danni dell'azione − danni dell'attacco sostituito) ÷ 3.
- Se non la nomina (un soffio): il round vale il massimo tra il Multiattacco e la media su 3 round (una volta l'azione, due volte il Multiattacco). Lo stesso senza Multiattacco.
- Simulatore completo (lib/monster-balance): l'attacco con Ricarica o usi limitati è letto come tale, sostituisce un attacco del Multiattacco solo quando è pronto (oppure, se il Multiattacco non lo nomina, si usa da solo quando è pronto), mai a ogni attacco.

## Dati rigenerati
- `lib/data/gs-riferimento.json` (12 mediane dei danni cambiate), `lib/data/monster-balance-srd.json` (Gorilla, Minotauro di Baphomet), numeri della taratura (2024: 246 «in linea», 7 «fuori») in `lib/balance-method.ts` e nelle tabelle di `docs/metodo-bilanciamento.md`.

## Peso
- Il calcolo e la sua tabella si caricano quando l'editor si apre (`lib/homebrew-cr-check.ts`, import dinamico): non sono più nel JavaScript di «Proponi» che il Bestiario scarica in anticipo.

## Prove
- `tests/cr-ricarica.cjs`: Squartatore (74 danni, GS stimato 12, in linea con GS 13), drago nero adulto (media su 3 round), Multiattacco senza Ricarica invariato, simulatore.
