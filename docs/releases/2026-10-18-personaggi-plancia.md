# Personaggi — plancia di gioco

Direzione approvata: esperienza ispirata alla gerarchia della scheda di BG3, con identità originale Grimorio scuro/oro. Revisione circoscritta alla scheda finale esistente; modello dati e compilazione conservati.

- Identità, ritratto caricabile (PNG/JPEG/WebP fino a 3 MB), livello e valori di combattimento.
- Modificatore dominante; punteggio, tiri salvezza e abilità accessibili dalle sei caratteristiche espandibili.
- Armi in schede compatte con bonus, danni e dettagli al tocco; protezioni e inventario separati.
- Munizioni: disponibili = 20 meno le caselle spese del modello originale, nessuna associazione automatica inventata con le armi.
- PF con assorbimento dei temporanei e limite di guarigione, slot e risorse con contatori limitati.
- Comandi rapidi e note aggiornano anche compilazione, storico manuale ed esportazione. Le modifiche sono in memoria, non cloud.
- Tutti i parametri della prima pagina restano nella sezione espandibile di dettaglio. Nessun dato esistente viene rimosso.
- Nessun modello AI, generazione a pagamento, nuova dipendenza, modifica database o produzione.

Verifiche: suite npm test, tests/character-dashboard.cjs, TypeScript e build Next --webpack. Il build Turbopack locale non supporta il symlink delle dipendenze dell’ambiente; il build webpack è superato. Chromium locale non avviabile per restrizione dei socket; la verifica UI viene svolta sulla preview nel browser cloud. Nessuna prova su iPhone fisico dichiarata.
