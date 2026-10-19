# Bestiario senza illustrazioni ed etichetta Equipaggiamento

Richiesta di Daniele del 19 ottobre 2026: togliere le immagini dalla versione pubblica conservandole per un possibile ripristino. Richiesta precedente ancora da applicare: sostituire «Attrezzatura» con «Equipaggiamento», anche per le future creazioni manuali.

## Base e coordinamento

- Produzione controllata prima della modifica: commit `32513f2f2529ea4a4e5870c5a833da3019c87f86`, deployment `dpl_4CGFysyZaNchqNKtbjaSjQnWYwjN` READY.
- Branch di questa attività: `fix/bestiario-no-art-equipment-20261019`, dalla stessa applicazione con il registro documentale del precedente rilascio.
- Ramo iPhone controllato tramite Git: `cloud/grimorio-ios-20261018` invariato a `e22f06ea8270cc632d59a57ef2c2021e780b6bb2`. Nessun merge mobile.

## Modifiche

- Rimosse dalle schede pubbliche di mostri e animali tutte le illustrazioni, inclusa la foto generica di ripiego. Intestazione testuale compatta; restano statistiche, fonti dei testi, preferiti, condivisione, condizioni e collegamenti agli incantesimi.
- La regola vale anche per i record manuali futuri, senza interventi per singolo ID.
- Nessun caricamento dei moduli delle illustrazioni dalla pagina pubblica. Nessuna immagine del bestiario dichiarata nei metadati Open Graph della scheda.
- Eliminata la preparazione automatica delle illustrazioni da `prebuild` e `predev`: non essendo più caricate dalla pagina, non servono alla compilazione o all’avvio. Conservati `prepare:art`, verifiche e sorgenti per un futuro ripristino esplicito.
- «Equipaggiamento» uniforme nella scheda pubblica, nell'anteprima e nel modulo amministrativo. Conservata la chiave interna `attrezzatura` per non perdere o migrare i valori esistenti.
- Fonti e licenze aggiornate per indicare che le illustrazioni sono archiviate e non visualizzate.
- Ambito: illustrazioni del bestiario; Home, immagini degli incantesimi e icone funzionali non modificate.

## Archivio di ripristino

File persistente creato e verificato: `Grimorio-immagini-bestiario-archivio-20261019.zip`.

- 336 immagini WebP conservate nei byte originali approvati, senza ulteriori ricompressioni.
- Registro completo di fonti/copyright, manifest con checksum e dimensioni, selettori e script di preparazione.
- Copia della pagina con illustrazioni e dei crediti prima della rimozione, per ripristino selettivo senza annullare future modifiche indipendenti.
- SHA-256 ZIP: `2319a8c99c490fb386dcc9b69c5f62a0b9dd3b9b293e57ad07b734062bad7946`.
- Test integrità ZIP riuscito; file salvato prima di rimuovere i riferimenti pubblici. Nessuna immagine cancellata dall'archivio o dalla copia locale.

## Verifiche e limiti

Test mirati riusciti: etichetta uniforme, valori conservati, collegamenti incantesimi ancora presenti, nessuna invocazione dei selettori di immagini o di Next Image nelle schede pubbliche, nessuna foto di ripiego, nessuna illustrazione nei metadati. `npm test`, `npm run test:creature-editor`, `npm run build` e `git diff --check` riusciti.

Non accedere al sito con browser o vie alternative finché resta il precedente rifiuto esplicito OpenAI. Le verifiche qui usano rendering locale e metadati Vercel, senza interrogare/modificare i dati reali.

Pubblicazione completata: commit `dc36bd670f8d2d727daf7ac01f0dff9a2b39882e`, deployment `dpl_G3Up3AxBDSjnZ3CxxhEBh4ZYdA2M` READY. Alias verificati nei metadati: `ilgrimorio.app`, `www.ilgrimorio.app`, `grimorioapp2024.vercel.app`. Log Vercel: `Build Completed in /vercel/output [14s]`, `Deployment completed`. La preview duplicata di questa attività `dpl_4S5zrXiE6WftXMVvKui8TP5H8cvb` è stata annullata; produzione completata regolarmente. Rollback precedente: `32513f2` / `dpl_4CGFysyZaNchqNKtbjaSjQnWYwjN`.
