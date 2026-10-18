# Prova controllata: immagini preparate per tre schede

Base: `f3d31e2`, anteprima con elenchi alleggeriti. Produzione controllata prima dell'intervento: `9613809`, WebP, deployment `dpl_6npjg7EhTQB2DMqoZzQVwGso96NT`. Branch `perf/prepared-art-pilot-20261018`. Non pubblicare in produzione senza riscontro sul dispositivo di Daniele.

La registrazione iPhone del 18 ottobre alle 21:49 mostra che il contenuto della scheda è disponibile prima della foto. Nell'apertura di Magmin, la zona dell'immagine rimane nera prima di essere riempita; lo spazio è già riservato, quindi non si tratta di un evidente cambiamento delle proporzioni. Il video non distingue rete, trasformazione remota, decodifica o altre cause: la conversione alla prima richiesta rimane un'ipotesi da verificare, non una causa dimostrata.

## Un confronto limitato

Solo Arto di troll, Magmin e Driade, in ambiente Vercel preview, usano copie WebP preparate una volta dai PNG del registro delle fonti approvate. `next/image` con import statico, `unoptimized` e `placeholder="blur"` serve direttamente file con hash da `/_next/static/immutable/media/`, senza richiesta al trasformatore `/_next/image` e senza dipendere da D&D Beyond durante la visita. Il segnaposto automatico è incluso nella pagina. Nessuna animazione o nuovo effetto di scorrimento.

La prova combina l'eliminazione della trasformazione runtime con il segnaposto; quest'ultimo migliora il feedback visivo, ma non costituisce una misura di velocità. Le altre immagini conservano il comportamento precedente. In produzione il selettore delle immagini preparate restituisce sempre `undefined`.

| Scheda | PNG sorgente | WebP pronto | Dimensioni |
| --- | ---: | ---: | --- |
| Arto di troll | 591.539 B | 144.588 B | 961 × 1000 |
| Magmin | 556.716 B | 84.626 B | 1000 × 645 |
| Driade | 448.538 B | 96.608 B | 568 × 1000 |

Qualità WebP 75, come la richiesta del percorso precedente; alphaQuality 100. Nessun ridimensionamento o ritaglio. Trasparenza confrontata pixel per pixel con gli originali: identica su tutte e tre. Confronto visivo delle coppie a dimensione di consultazione: nessuna differenza evidente; la compressione colore non è lossless. Questi byte non sono un confronto con la risposta WebP ottimizzata precedente e non dimostrano minore latenza su iPhone. Nessuna modifica alle fonti o ai crediti delle schede.

## Verifiche e coordinamento

Test nuovo osservato in fallimento prima dell'implementazione, poi superato: selezione limitata alla preview, nessuna attivazione per produzione o altre creature, file statici serviti senza ottimizzatore, dimensioni reali e segnaposto presenti nei props HTML di Next. Build verificata; suite completa eseguita insieme ai controlli esistenti delle schede, che isolano il caricamento degli asset gestito dal bundler Next.

Nessuna modifica a database, dati amministrativi, immagini originali remote, analytics, Capacitor o codice iOS. File condiviso cambiato: `app/mostro/[id]/page.tsx`; aggiunti `lib/prepared-monster-art.ts`, tre asset e test. Non integrare automaticamente nel filone iPhone. La verifica finale rimane la stessa sequenza della registrazione sul telefono/rete dell'utente.

Riferimento tecnico: https://nextjs.org/docs/app/api-reference/components/image (import statico, blur placeholder, unoptimized).

## Esito runtime della preview

Deployment `dpl_7Wrrp3LZePRbEYub9JUmk3gBFz2b` READY, commit applicativo `16fc39135fb2ee00ecb8c8c898ba80dc9008f859`. URL: https://grimorioapp2024-12k9q3v4o-grimorio-app.vercel.app. Richieste reali alle tre pagine: il tag immagine contiene il segnaposto; tutti i file sono URL statici `/_next/static/immutable/media/`, HTTP 200, Content-Type image/webp, Cache-Control public,max-age=31536000,immutable, byte identici ai file preparati. Nessuna richiesta al trasformatore per queste immagini. Immagini caricate nel browser e schede complete verificate. Suite completa e build terminate con exit code 0. Non riportiamo tempi di questo ambiente come tempi su iPhone; attesa prova utente. Nessuna promozione in produzione.
