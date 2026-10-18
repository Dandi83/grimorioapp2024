# Prova web: illustrazioni ufficiali

Richiesta di Daniele: provare le immagini ufficiali dei mostri, mantenendo per ora accesso gratuito e senza registrazione. Questa è una prova visiva limitata a due schede, non una certificazione di licenza né un'importazione dell'intero manuale.

## Isolamento

- Branch: `preview/official-monster-art-20261018`, discendente della produzione `0dcb9f3` e delle istruzioni di coordinamento `3785871`.
- Nessuna attività mobile in corso risultava nella chat `IL GRIMORIO — iPhone · Codex Cloud` al controllo iniziale.
- Le immagini sono selezionate solo con `VERCEL_ENV=preview`, per `aboleth` e `orsogufo`. Produzione, sviluppo ordinario e altri ID mantengono l'immagine generica esistente.
- Nessun aggiornamento ai dati o al database; nessuna modifica agli elenchi, alle edizioni o alle statistiche delle creature. Nessun deploy produzione.

## Immagini e provenienza

Le immagini sono state individuate nei tag immagine delle pagine ufficiali pubbliche, scaricate temporaneamente per ispezione e mantenute senza modifiche grafiche. I file non sono copiati nel repository: Next Image le carica dalla fonte con allowlist dei soli due URL esatti.

| Creatura | Fonte ufficiale | Immagine | Dimensioni |
| --- | --- | --- | --- |
| Aboleth | https://www.dndbeyond.com/monsters/5194867-aboleth | https://www.dndbeyond.com/avatars/thumbnails/47138/549/1000/1000/638741963682090474.jpeg | 1000×641 |
| Orsogufo / Owlbear | https://www.dndbeyond.com/monsters/5195152-owlbear | https://www.dndbeyond.com/avatars/thumbnails/47139/138/1000/1000/638741964495949233.jpeg | 800×1000 |

Crediti pubblicati: illustrazione © Wizards of the Coast LLC, link alla scheda ufficiale e alla Fan Content Policy, indicazione di contenuto fan non ufficiale e assenza di approvazione/sponsorizzazione. Nessun nome di artista attribuito senza riscontro. Le immagini sono esplicitamente distinte dai testi SRD e dalla loro licenza Creative Commons.

La Fan Content Policy è stata letta: https://company.wizards.com/en/legal/fancontentpolicy. Permette l'arte su pagine fan conformi, ma contiene altri limiti e non equivale a un'autorizzazione verificata per ogni uso di un bestiario. Non è stata richiesta o ricevuta un'approvazione scritta di Wizards. Il passaggio in produzione o nell'app iPhone non è incluso nella prova.

## Resa e verifiche

- Immagini intere nelle proporzioni originali, senza ritagli; controlli indietro, condivisione e preferiti mantenuti.
- Titolo, GS e sottotitolo sotto l'illustrazione, su sfondo scuro leggibile. Crediti vicini all'immagine.
- Allowlist remota limitata a due URL HTTPS, senza parametri query.
- Verificato il selettore: restituisce immagini solo in preview per i due ID; nessuna immagine in produzione/sviluppo o per ID sconosciuti, anche `__proto__`/`constructor`.
- `npm test` completo e `npm run build`: passati. Aggiornati solo i loader dei test che importano la pagina per risolvere il nuovo modulo.
- Verifica del deploy e del caricamento immagini da completare sull'URL preview prima della consegna.

## File condivisi da coordinare con iPhone

`app/mostro/[id]/page.tsx`, `next.config.mjs`; nuovo `lib/monster-art-preview.ts`. I test aggiornati sono `scripts/check-srd-monster-sample.mjs`, `scripts/check-srd-monsters.mjs`, `tests/legacy-monsters.cjs`. Non integrare automaticamente questa prova nel branch mobile.
