# Rilascio pubblico approvato

Daniele ha approvato la preview BG3 e richiesto «Pubblica» il 18 ottobre 2026. Base: 9808b3cbc242193b1d80f693e91c90b2808de4a3.

Il primo rebuild production ha evidenziato i gate preview: Personaggi e Manuale rispondevano 404. Questo aggiornamento abilita in production gli stessi contenuti approvati: Manuale, 330 creature, integrazioni incantesimi, rimandi e sessione personaggio. Nessuna scrittura al database; precedenza dei dati esistenti preservata. Salvataggio personaggi temporaneo ed esportazione JSON; account/cloud ancora inattivi.

Verifiche: test di parità preview/production (prima falliti, poi superati), suite npm test, test dashboard, TypeScript e build Next webpack superati. Nessuna nuova prova su iPhone fisico.
