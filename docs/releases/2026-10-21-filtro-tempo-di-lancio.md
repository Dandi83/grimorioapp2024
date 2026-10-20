# Filtro «Tempo di lancio» negli Incantesimi (21 ottobre 2026)

Nuovo gruppo separato nel pannello Filtri di /grimorio: Azione, Azione bonus, Reazione, 1 minuto o più. Selezione multipla: «o» dentro il gruppo, «e» con gli altri filtri. Vale per 2024 e 2014, con il contatore «Mostra N risultati», anche offline (lavora sull'elenco già scaricato).

- Funzione unica `castingTimeGroup` in `lib/spells-types.ts`: legge solo le lettere del campo `tempo_di_lancio` e prende il primo tempo nominato. Così funzionano anche i valori dell'elenco 2024 rovinati dal testo del PDF («a5z°i one», «2az° ione bonus», «l minuto», «o re»), che la scheda mostra corretti. «1 azione o 8 ore» e «Azione (Groviglio) o 8 ore (Fertilità)» contano come Azione.
- Nessun campo nuovo nell'indice: `tempo_di_lancio` era già nell'elenco leggero; il controllo del bundle resta verde.
- Indirizzo: `?tempo=azione,reazione` (valori `azione`, `azione-bonus`, `reazione`, `lungo`), ricordato anche tornando indietro da una scheda.

Conteggi (tutti i valori riconosciuti):
- 2014 (319): Azione 242 · Azione bonus 14 · Reazione 4 · 1 minuto o più 59.
- 2024 in produzione (388 in elenco): Azione 295 · Azione bonus 34 · Reazione 4 · 1 minuto o più 55; per tutti i 388 il gruppo coincide con quello del tempo di lancio mostrato nella scheda.
