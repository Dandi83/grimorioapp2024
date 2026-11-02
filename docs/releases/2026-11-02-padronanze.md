# PROMPT 47 — Padronanze delle armi: nome inglese, pagina dedicata e ricerca (2 novembre 2026)

## Prova delle coorti
- `e2e/approfondimenti.spec.mjs` si aspettava sempre «100%, 0%, —» per una persona arrivata 21 giorni prima e tornata 14 giorni prima. La sera di domenica 1/11 a Roma (dopo il cambio dell'ora del 25/10) l'arrivo cade di lunedì e la settimana «2 dopo» finisce quella stessa domenica: non è ancora chiusa, quindi «—». Il codice (`lib/analytics-stats.ts` cohorts()) era giusto; la prova ora calcola i valori attesi con la stessa regola (`e2e/cohort-expect.mjs`), controllata su date fisse da `tests/cohort-dates.cjs` (domenica sera, lunedì mattina, fine mese, i due cambi dell'ora).

## Padronanze
- Nomi inglesi (`lib/data/nomi-inglesi-srd.json`, «padronanze», solo 2024), dal PDF inglese SRD 5.2.1 (p. 90 «Mastery Properties», p. 91 tabella delle armi, arma per arma): Colpo di striscio = Graze, Doppio fendente = Cleave, Fiaccare = Sap, Graffio = Nick, Lentezza = Slow, Rovesciamento = Topple, Spinta = Push, Vessazione = Vex.
- Pagine `/equipaggiamento/padronanze/<id>` (`lib/weapon-masteries.ts`): testo da `masteryText` (lo stesso delle schede), armi 2024 con quella padronanza nell'ordine della lista, attribuzione con la pagina del manuale italiano. Statiche, sotto la sezione «armi» (nascosta con lei, e con la sua edizione 2024).
- Scheda dell'arma 2024: «Vessazione (Vex)» e «Tutte le armi con Vessazione ›». La lista resta solo in italiano.
- Ricerca: sezione «Padronanze» con il nome inglese; in 2014 tra i risultati «solo 2024».
- Forma usata per «Colpo di striscio»: quella del titolo della voce del manuale SRD 5.2.1 italiano («Colpo di striscio»); la tabella delle armi resta com'è («Colpo di Striscio» per il Falcione).
