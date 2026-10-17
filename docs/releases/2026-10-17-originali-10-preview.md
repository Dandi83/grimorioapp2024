# Dieci testi preesistenti fuori SRD — sintesi originali 2024

Richiesta: sostituire anche le dieci descrizioni preesistenti non coperte
dal SRD con sintesi originali delle meccaniche 2024. Conservare asterischi,
nomi, ID, preferiti e le altre 379 schede.

Schede: Amicizia, Arma elementale, Armatura di Agathys, Aura di purezza,
Aura di vitalità, Braccia di Hadar, Calderone ribollente di Tasha,
Cerchio di potere, Cordone di frecce e Corona di follia.

## Controlli editoriali

Confronto effettuato con le dieci schede PHB 2024 pubblicamente consultabili
su AideDD; URL specifici nel dataset. Nuovi testi in forma di riepilogo,
senza riproduzione del testo originale o traduzione frase per frase.
Preservati: bersagli, visibilità, eccezioni automatiche, condizioni,
distanze, danni, tiri salvezza, tempi di attivazione, concentrazione e
progressioni. Cerchio di potere ora specifica correttamente il vantaggio
ai tiri salvezza contro incantesimi e altri effetti magici; la precedente
descrizione conteneva una frase incompleta.

I due link rimossi dalle 39 schede restano assenti anche sulle dieci nuove
sintesi. Le attribuzioni SRD e i link alle statistiche degli spiriti restano
invariati. Aggiornata la legenda: 49 sintesi originali, nessuna delle dieci
vecchie descrizioni viene presentata come testo autorizzato o SRD.

## Protezione dei dati

Nessuna scrittura nel database condiviso. Sostituzione in lettura solo se
l’hash SHA-256 del testo corrisponde alla versione esaminata: dieci hash
nel manifest del dataset. Qualsiasi modifica editoriale successiva prevale.
La descrizione precedente non viene duplicata nei nuovi file.

## Verifica

- Test prima della modifica: fallimento atteso 39 contro 49 sintesi.
- `npm test`: 49 sintesi, 340 record SRD invariati, marker e rendering.
- `npm run build`: compilazione e TypeScript riusciti.
- `git diff --check`: riuscito.
- Controllo eseguito sui dieci testi realmente serviti dall’app: tutti
  sostituiti con gli hash approvati; tutte le dieci variazioni editoriali
  successive preservate.

Conteggi attesi nella preview: 389 schede, 340 trascrizioni SRD,
49 sintesi originali con asterisco, nessuna descrizione vuota.
Produzione invariata fino all’approvazione della preview.
