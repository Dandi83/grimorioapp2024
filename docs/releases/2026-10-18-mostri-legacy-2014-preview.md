# Dieci aggiunte SRD 5.1 — D&D 2014

## Ambito approvato

Duergar, Elfo drow, Gnomo delle profondità (svirfneblin), Lucertoloide, Orco, Sciame di scarabei, Sciame di millepiedi, Sciame di ragni, Sciame di vespe, Topo gigante contagioso.

Le sei creature speciali individuate nell'audit sono escluse. Totale catalogo: 340 schede (330 preesistenti, immutate, e 10 nuove). Le raccolte comprendono 240 mostri e 100 animali/varianti animali.

## Fonti e visualizzazione

- Trascrizione dal PDF italiano ufficiale SRD 5.1; URL, SHA-256, pagine e testo sorgente conservati nei dati.
- Varianti applicate alle basi 2014: sciame di insetti, pagina 436; topo gigante, pagine 442–443. Nessuna conversione alle regole 2024.
- Duergar completo dell'azione Invisibilità continuata a pagina 348.
- Bollino “SRD 5.1 · D&D 2014” nel catalogo, nei preferiti e nella scheda, con collegamento alla fonte. I bollini 2024 esistenti restano invariati.
- Fonte e attribuzione del dettaglio dipendono dalla versione effettiva. Le varianti dichiarano l'adattamento alla scheda base.
- Dichiarazione CC BY 4.0 dello SRD 5.1 nella pagina Fonti e licenze.
- Stile e icone dei danni conservati. Nessun collegamento implicito dalle schede 2014 alle condizioni/incantesimi 2024.
- Precedenza delle eventuali modifiche esistenti nel database preservata; una scheda modificata perde l'attribuzione esatta.

## Verifiche

- Baseline `npm test`: superata prima delle modifiche.
- Nuovo test RED: catalogo attuale 330 anziché 340. Test raccolta animali RED: 95 anziché 100.
- `npm test`: superato, inclusi tutti i test preesistenti e i nuovi controlli Legacy.
- `npm run build -- --webpack`: superato, inclusa compilazione TypeScript.
- Confronto di punteggi di caratteristica, statistiche e paragrafi resi con il testo estratto: superato per tutte le dieci schede.
- Revisione indipendente: statistiche e azioni confermate sul PDF; corretto e coperto con test RED/GREEN il caso di scheda Legacy modificata nel database che non deve attivare collegamenti 2024.
- Controlli HTTP online della preview superati con `scripts/check-legacy-live.py`: catalogo 340, 10 bollini D&D 2014 e 330 bollini 2024; tutte le dieci pagine nuove con testo integrale di tratti/azioni e fonti corrette; quattro pagine 2024 preesistenti; pagina attribuzioni. Produzione verificata ancora a 330 voci e senza le nuove schede.
- Verifica visiva/mobile: non eseguita; Chromium locale è bloccato dai permessi dell'ambiente (`socket() failed: Operation not permitted`). Non è stato tentato un aggiramento.

## Pubblicazione

Solo preview. Nessuna scrittura al database, nessuna assegnazione del dominio ufficiale e nessun deploy in produzione autorizzato da questa attività.

- Preview verificata: https://grimorioapp2024-86wqprtsa-grimorio-app.vercel.app/bestiario
- Commit del codice verificato: `a0cb5a26123702e8e577e0ae4fed8913bfce3d7c`.
- Deployment verificato: `dpl_4PJ9DWqk3spyoUnHuS823WfA4B48`, stato READY, target preview.
