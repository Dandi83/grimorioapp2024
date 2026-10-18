# Illustrazioni ufficiali del bestiario — estensione web

Daniele ha approvato la direzione visiva della prova Aboleth/Orsogufo e chiesto di estenderla al bestiario con fonti e crediti corretti. Branch `ui/official-creature-art-20261018`, base `bb529723f0432f1908b8f802840f94744ac8ccde`. Nessuna integrazione automatica nel lavoro iPhone.

## Copertura verificata

Catalogo pubblico: 341 creature, comprese le 340 dei dati SRD e il Beholder aggiunto nell'amministrazione. Nessuna modifica ai contenuti o al database.

- 336 schede hanno un'immagine pubblica verificata su D&D Beyond: 240 mostri e 96 animali.
- Le 330 creature 2024 sono state confrontate con l'indice ufficiale delle Basic Rules: corrispondenze individuate tramite sei caratteristiche, PF e CA, poi controllate per nome italiano/inglese. Le pagine con nome duplicato sono state deduplicate per URL. Lo Scheletro di cavallo da guerra, assente dall'indice corrente, è stato controllato separatamente.
- Le dieci creature/varianti 2014 sono state cercate nelle rispettive pagine ufficiali, senza sostituirle con creature 2024.
- Per ogni immagine: URL della fonte, nome inglese, nome italiano, dimensioni effettive lette dal file, data della verifica e copyright. Nessun artista inventato: il campo resta nullo quando non individuato nella fonte.
- Per il Beholder, l'illustrazione è collegata pubblicamente dall'elenco ufficiale delle aberrazioni. La scheda dettagliata rimanda al negozio: non è stata usata per accedere a contenuti riservati.
- Un timeout nel controllo dell'immagine dello Stormo di corvi è stato risolto con un secondo controllo dello stesso URL pubblico.

Registro utilizzato dal sito: `lib/data/official-creature-art.json`. I file immagine non sono copiati nel repository. Non sono stati generati nuovi asset o consumati crediti.

## Cinque schede senza immagine pubblica nelle fonti controllate

Mantengono il precedente sfondo generico; non viene attribuita loro l'immagine di un'altra creatura.

| Scheda | Fonte controllata |
| --- | --- |
| Scheletro di cavallo da guerra | https://www.dndbeyond.com/monsters/17050-warhorse-skeleton |
| Sciame di scarabei | https://www.dndbeyond.com/monsters/301407-swarm-of-insects-beetles |
| Sciame di millepiedi | https://www.dndbeyond.com/monsters/301411-swarm-of-insects-centipedes |
| Sciame di ragni | https://www.dndbeyond.com/monsters/301414-swarm-of-insects-spiders |
| Sciame di vespe | https://www.dndbeyond.com/monsters/301415-swarm-of-insects-wasps |

Questo è l'esito delle fonti consultate, non l'affermazione che tali illustrazioni non esistano altrove.

## Resa, isolamento e diritti

Resta il layout approvato: immagine intera nelle sue proporzioni, titolo/GS sotto, pulsanti indietro/condivisione/preferiti e crediti vicini. Testi ed edizioni delle schede, elenchi pubblici senza bollini, navigazione e amministrazione restano invariati.

Il selettore rimane attivo solo con `VERCEL_ENV=preview`: il dominio ufficiale non riceve queste illustrazioni. La configurazione Next limita le origini a HTTPS D&D Beyond e alle 18 cartelle effettivamente usate; il registro delle schede contiene soltanto gli URL individuali verificati. Il raggruppamento delle cartelle rispetta il limite Next di 50 remotePatterns.

I crediti identificano Wizards of the Coast LLC e collegano la fonte pubblica e la Fan Content Policy. Le illustrazioni sono distinte dai testi SRD e dalla licenza Creative Commons. La verifica della provenienza non certifica da sola i diritti di riutilizzo di una raccolta completa. La Fan Content Policy consente arte nelle pagine fan conformi ma contiene anche limiti sui componenti di gioco e sulle ripubblicazioni; nessuna autorizzazione specifica di Wizards è stata ricevuta. Fonte letta il 18 ottobre 2026: https://company.wizards.com/en/legal/fancontentpolicy.

## Verifiche

Controllati tutti i 341 ID: 336 immagini e cinque fallback espliciti; nessun asset per ID sconosciuti o nomi speciali del prototipo JavaScript, nessun asset in ambiente produzione/sviluppo. Le immagini delle pagine ufficiali hanno nomi coerenti con le creature e dimensioni almeno 200×200. La verifica runtime del nuovo deployment viene effettuata dopo la creazione dell'anteprima.

`npm test` completo e `npm run build`: superati. Il controllo del registro finale ha verificato copertura, identità, dimensioni, origini e isolamento degli ambienti; la configurazione contiene 18 cartelle consentite.

File condivisi cambiati rispetto alla prova: `lib/monster-art-preview.ts`, `next.config.mjs`; nuovo registro JSON. La pagina di dettaglio mantiene il codice della prova approvata. Prima di trasferire questo lavoro nel client iPhone occorre un'integrazione esplicita e verificata.
