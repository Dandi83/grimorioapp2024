# Tendine nel modulo mostri — preview

Il modulo guidato aggiunge selettori nativi per tipo di creatura, taglia,
allineamento, grado di sfida (incluse le frazioni) e velocità base. Ogni
selettore comprende «Valore personalizzato» e conserva integralmente le
stringhe già presenti che non corrispondono a una scelta standard, inclusi
sottotipi e modalità di movimento multiple.

Vulnerabilità, resistenze e immunità ai danni permettono di aggiungere uno
alla volta i tipi di danno. Immunità alle condizioni e linguaggi hanno
analoghi menu di aggiunta. Le scelte si accodano al testo esistente senza
sostituire qualificazioni particolari; la stessa voce separata da virgole o
punti e virgola non viene aggiunta due volte (confronto senza distinzione
tra maiuscole e minuscole). Il testo completo resta modificabile.

I campi mantengono i nomi e il formato già accettati dalle azioni server:
nessuna migrazione o modifica al database. Valori numerici, bonus, sensi e
contenuti delle capacità si compilano nel modulo guidato già disponibile.
I menu dell’edizione della scheda rimangono nell’elenco amministrativo.

## Verifica

- `npm test`: suite completa superata.
- `npm run build`: superata, con verifica TypeScript.
- Test DOM delle selezioni: tipo, taglia, allineamento, GS frazionario,
  velocità standard e personalizzata, resistenze multiple, duplicati,
  qualificazioni libere e immunità alle condizioni.
- Anteprima e FormData: valori selezionati corretti, qualificazioni conservate,
  nessuna mutazione durante l’anteprima, campi preservati dopo errore.
- Scheda lich invariata: stringhe di tipo, taglia, allineamento, GS, velocità,
  resistenze, condizioni, sensi e linguaggi conservate, compreso il sottotipo
  «Non morto (mago)».

I controlli DOM non confermano l’impaginazione su dispositivi reali: resta
la verifica visiva su iPhone. Nessun salvataggio eseguito sul database reale.
Rilascio solo in preview, senza promozione in produzione.
