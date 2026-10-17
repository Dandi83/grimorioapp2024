# Scheda digitale — prima pagina

## Richiesta corretta
Il PDF è l'inventario dei parametri, non l'interfaccia da riprodurre. La prima pagina diventa un modulo digitale nativo, con stile scuro/oro dell'app, campi leggibili e controlli touch. Le altre tre pagine restano nel modello PDF disponibile come riferimento. Solo preview, account e sincronizzazione ancora inattivi.

## Modifiche
- Scheda digitale predefinita, con riepilogo PF, CA, iniziativa e competenza e sezioni Essenziale, Caratteristiche, Armi e munizioni, Talenti e capacità.
- Inventario esplicito dei 291 campi e caselle della pagina 1, verificato senza omissioni né duplicati rispetto al modello originale.
- Identità completa con giocatore, allineamento e PE, sei caratteristiche, 18 abilità con competenza e maestria, tiri salvezza, percezione/indagare passivi, ispirazione, protezioni, resistenze, sensi e tutte le velocità.
- PF modificabili e danno/cura, 20 dadi vita usati, tre successi/fallimenti morte, sei attacchi con gittata/peso/note, tre tipi di munizioni da 20 contatori e otto capacità con recupero e cinque usi.
- Ripristino del calcolo per gli override, nessuna immagine del PDF nella nuova vista. Valori e campi liberi restano nel modello condiviso, negli snapshot e nell'export JSON.
- Corrette le associazioni storiche dei campi PDF: Ispirazione (in basso a sinistra) corrisponde a Indagare passivo, VRI1.5 a Ispirazione; sesto attacco e tiri contro morte condivisi con la gestione rapida.

## Verifiche locali
Suite completa e prima build webpack superate; test aggiuntivo confronta tutti i 291 parametri ed esercita morte, indagare passivo, sesto attacco e campi liberi. TypeScript senza errori. Il collaudo della preview viene eseguito dopo il rilascio; nessuna verifica su iPhone fisico dichiarata.
