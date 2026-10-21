# Compendio: Avanzamento di livello (21 ottobre 2026)

Nuova pagina `/avanzamento`, raggiungibile dal riquadro «Avanzamento di livello» del Compendio (nessun riquadro in Home, nessuna voce nuova nella barra; «Compendio» resta evidenziato, in alto «‹ Compendio»).

## Contenuto

1. Tabella di avanzamento (livello, PE, bonus di competenza), valida per 2014 e 2024; distintivo ambra ai livelli 5, 9, 13 e 17. Numeri con il punto delle migliaia anche a quattro cifre (2.700).
2. Punti ferita fissi per classe dal 2º livello (7/6/5/4 + mod. Cos), uguali in SRD 5.1 e 5.2.1.
3. «Talenti bonus oltre il 20º livello» (regola 2024): testo integrale del riquadro «Talenti bonus al 20º livello» della voce «Creazione del personaggio» del Manuale 2024, con gli a capo e le sillabazioni del PDF ricomposti.
4. Calcolatore di PE, tutto nel browser: personaggi 1–10 (4), righe di mostri con grado sfida e contatore, PE già posseduti facoltativi, risultato con livello e PE mancanti, «Azzera». PE a testa arrotondati per difetto, con il resto indicato.

## Dati

- `lib/advancement.ts`: tabella e PF fissi; i test li confrontano con le tabelle «Avanzamento dei personaggi» e «Punti ferita fissi per classe» del Manuale 2024.
- `lib/advancement-challenge.ts`: PE per grado sfida letti dalle schede SRD dei mostri (2014, 2024, animali), compresi i valori «nella tana». GS 0 ha due valori nelle schede (0 e 10 PE) e compaiono entrambi. Un valore presente su una sola scheda, quando lo stesso GS ha un altro valore su tre o più schede, è escluso come refuso: oggi solo Arcimago 2024 (GS 12, 8.000 invece di 8.400). GS 18 e 25–29 non hanno schede e non compaiono.
- Service worker: `/avanzamento` tra le pagine salvabili offline.
