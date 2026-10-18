# Bestiario: sezioni Mostri e Animali

Richiesta: rinominare il menu pubblico «Mostri» in «Bestiario» e separare mostri e animali nel catalogo. Rilascio in preview.

- Titolo e navigazione: Bestiario.
- Due selettori sempre visibili: Mostri e Animali, con conteggi ricavati dal catalogo caricato.
- Catalogo di riferimento: 240 mostri e 100 animali. La classificazione conserva le raccolte delle fonti, incluso l'alce gigante celestiale e le cinque varianti animali 2014.
- Apertura predefinita sui mostri; i link `?raccolta=animali` e `?raccolta=mostri` continuano a funzionare.
- Ricerca e filtri operano nella sezione scelta. Il cambio di sezione mantiene la ricerca e azzera i filtri per proprietà; «Pulisci» mantiene la sezione.
- Selettori con stato accessibile e area di tocco minima di 44 px, ricerca etichettata, conteggio risultati annunciato.

Verifiche locali: `npm test`, `npm run build`, `git diff --check`, compilazione Python del controllo HTTP Legacy. Il nuovo test DOM usa i 340 record reali e verifica i passaggi tra sezioni, la classificazione, la ricerca, i filtri e il collegamento diretto agli animali. Il controllo HTTP Legacy è aggiornato per verificare le due sezioni senza sovrapposizioni.

Nessuna modifica ai contenuti delle schede o al database. La pubblicazione in produzione richiede l'approvazione della preview.
