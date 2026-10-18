# Anteprima completa: immagini preparate del Bestiario

Daniele ha provato il pilota su iPhone e riferisce «Sembra più veloce». È un riscontro soggettivo positivo sulle tre schede, non un benchmark o una prova di tutti i dispositivi. Estendiamo lo stesso percorso alle 336 illustrazioni già approvate, esclusivamente in preview. La produzione è stata ricontrollata all'inizio: `9613809`, deployment `dpl_6npjg7EhTQB2DMqoZzQVwGso96NT`; nessuna promozione autorizzata da questo intervento.

Base `6e61db371555475b8f325198dd41465c9332a060` (documentazione del pilota, codice applicativo `16fc3913`), branch `perf/prepared-art-catalog-20261018`.

## Preparazione e conservazione

Tutte le 336 sorgenti sono quelle del registro `official-creature-art.json`. Conversione una sola volta in WebP qualità 75, alphaQuality 100, effort 6, senza ridimensionamento o ritaglio. Per ciascuna immagine sono stati verificati dimensioni originali e canale alpha, confrontato pixel per pixel. Nessun errore durante la preparazione. Manifest con URL originale, checksum SHA256 dei due file, dimensioni e byte: `lib/data/prepared-art-manifest.json`.

Totale delle sorgenti: 169.703.568 byte. Totale dei WebP preparati: 25.931.450 byte. È la dimensione dell'intera collezione su disco, non il traffico di una visita; il browser riceve soltanto l'immagine scelta dalla pagina aperta. Non usiamo questa riduzione rispetto agli originali per dichiarare un guadagno rispetto al precedente percorso WebP di Next.

Le tre immagini del pilota sono riutilizzate identiche. Il selettore `getPreparedMonsterArt` ora copre tutto il registro. Import statici Next forniscono hash e segnaposto; `unoptimized` evita la trasformazione alla richiesta. In produzione il selettore continua a restituire `undefined`, così il percorso pubblico resta escluso da questo esperimento. Le schede senza illustrazione registrata mantengono il fallback. Testi, fonti e crediti invariati; nessun dato amministrativo sovrascritto.

I file mancanti sono preparati prima di build, dev e test, mai durante le richieste degli utenti. Il manifest bloccato verifica gli SHA256 della sorgente e del WebP ottenuto. File già presenti con checksum corretto sono riutilizzati senza rete. Comando:

```sh
npm run prepare:art
```

Lo script verifica i domini sorgente, lega la cache all'URL e rigenera file quando cambia la sorgente o il checksum. Per aggiornare esplicitamente le sorgenti, lo script offre anche `--write /absolute/source-cache`; questo non avviene nei deploy. Per riprodurre la conversione usa sharp della catena Next bloccata dal lockfile. La compressione colore è lossy, come nel pilota e nel precedente WebP qualità 75; risoluzione e trasparenza sono conservate.

## Verifiche e coordinamento

Il test esteso è stato osservato in fallimento su Aboleth, assente dal pilota. Dopo l'estensione verifica tutte le immagini approvate, corrispondenza manifest/registro, checksum dei file reali, dimensioni, segnaposto, esclusione dell'ottimizzatore e isolamento dalla produzione. Suite completa e build concluse con exit code 0.

Non sono stati toccati file iOS, Capacitor, dati, database, consenso o analytics. File condiviso cambiato in questo passaggio: solo `lib/prepared-monster-art.ts`; la pagina `app/mostro/[id]/page.tsx` resta quella già coordinata nel pilota. Aggiunti asset, manifest e script; esteso il test. Nessuna integrazione automatica nella chat iPhone.

Il deploy runtime e il confronto su altre schede del dispositivo di Daniele completano la verifica della preview. Non sono state misurate prestazioni fisiche iPhone/LCP in questo ambiente.

I tre asset del pilota restano nel repository; gli altri sono generati nel deploy dai contenuti verificati, evitando il trasferimento di centinaia di file tramite il connettore. Il primo build dipende dal raggiungimento delle sorgenti approvate e fallisce se i checksum cambiano. Dopo la build le visite usano solo i file statici del deploy. `.gitignore` esclude le copie generate; sorgenti del generatore e manifest sono versionati.
