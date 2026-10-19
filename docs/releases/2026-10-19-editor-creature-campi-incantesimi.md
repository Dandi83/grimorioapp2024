# Editor creature: campi completi e collegamenti incantesimi

Stato: implementato e verificato localmente; successivamente pubblicato con autorizzazione esplicita di Daniele. Commit live `32513f2f2529ea4a4e5870c5a833da3019c87f86`, deployment `dpl_4CGFysyZaNchqNKtbjaSjQnWYwjN` READY e assegnato a ilgrimorio.app. Registro in `2026-10-19-pubblicazione-editor-creature.md`.

## Base e coordinamento

- Produzione verificata tramite metadati Vercel: `dpl_84A2nDQ3SbuQzSYbac5s8os2p6gk`, READY, commit `dcb26333c56aa43e1f7bd324725ebf44168aea26`, branch `release/prepared-art-20261018`.
- Ramo di lavoro web: `fix/admin-creature-fields-20261019`, da quel commit.
- Ramo iPhone remoto controllato con `git ls-remote`: `cloud/grimorio-ios-20261018`, ancora `e22f06ea8270cc632d59a57ef2c2021e780b6bb2`. Nessun merge mobile, nessuna modifica al client iOS.

## Richiesta e soluzione

Daniele segnala che la scheda Mind Flayer 2024 compilata manualmente non collega i nomi degli incantesimi e che iniziativa, bonus di competenza ed equipaggiamento non sono modificabili. Chiede una soluzione generale per schede esistenti e future.

- I nomi esatti del catalogo nelle liste «A volontà:», «1 volta al giorno ciascuno:» e «1/giorno:» vengono riconosciuti anche senza corsivo; parentesi e punteggiatura rimangono visibili.
- Trasformazione solo nel rendering e nell'anteprima, senza riscrivere i contenuti salvati. Testo narrativo ordinario non trasformato in collegamenti. Schede 2014 ancora escluse dai collegamenti a incantesimi 2024.
- Editor e anteprima includono iniziativa, bonus di competenza, equipaggiamento/armatura e azioni bonus. Sono conservati/modificabili anche i campi opzionali preesistenti immunità combinate e sottotitolo.
- I campi opzionali vengono letti da `grimorio_monster_details`, tabella separata creata solo nel salvataggio amministrativo autenticato. Nessun ALTER della tabella monsters e nessuna creazione durante letture pubbliche.
- Salvataggio atomico di contenuto, dettagli ed edizione. Moduli precedenti che omettono i nuovi campi ne conservano i valori; un campo esplicitamente vuoto ne cancella il valore. Cancellazione della creatura con rimozione dei dettagli tramite chiave esterna.

## Verifiche

- `npm run test:creature-editor`: riuscito. Rendering reale pagina/anteprima dei tre nomi riferiti nel testo fornito da Daniele, isolamento 2014, campi facoltativi, form DOM, persistenza SQL con PGlite, lettura per riapertura editor, cancellazione esplicita, vecchi moduli e rollback su errore.
- `npm test`: suite completa riuscita, incluse conservazione delle fonti, cataloghi, preferiti, condivisione e consenso statistiche.
- `npm run build`: riuscito, TypeScript e build Next.js.
- `git diff --check`: riuscito.
- Nessun database reale collegato o modificato. Nessun seed o migrazione eseguita. Nessun contenuto Mind Flayer/Mimic inserito tramite script o fixture.
- Nessuna verifica browser sul dominio: l'auto-review OpenAI ha precedentemente rifiutato l'accesso a ilgrimorio.app e vietato ulteriori tentativi/aggiramenti. Le verifiche qui usano sorgenti e dati locali di prova.
- La prima pubblicazione dovrà distinguere build verificata da verifica runtime effettiva. Non attribuire una prova iPhone a questi test DOM.

## File condivisi con eventuale futuro porting iPhone

`app/actions/admin-monsters.ts`, `app/mostro/[id]/page.tsx`, `components/admin-monster-content.tsx`, `components/admin-monster-editor.tsx`, `components/admin-monster-preview.tsx`, `lib/admin-content-save.ts`, `lib/content-editions.ts`, `lib/monsters.ts`, `lib/spell-references.ts`, nuovi `lib/monster-extra-fields.ts` e `lib/monster-extra-storage.ts`. Integrazione iPhone futura solo esplicita e verificata.
