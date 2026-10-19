# Pubblicazione editor creature — 19 ottobre 2026

Autorizzazione esplicita di Daniele: «Pubblica allora», 19 ottobre 2026, ore 13:52 Europe/Rome.

- Progetto Vercel: `grimorioapp2024`, `prj_PjDCPQlG4DMh9p2ZIlBTppZMSGMq`.
- Team: `team_2wnC0kx2WC2ryPk53cerZRsn`.
- Commit applicativo: `32513f2f2529ea4a4e5870c5a833da3019c87f86`.
- Branch: `fix/admin-creature-fields-20261019`.
- Albero Git verificato identico al codice testato localmente: `8497a91d91ec28fca3967ec281d68a44e511a34e`.
- Deployment produzione avviato: `dpl_4CGFysyZaNchqNKtbjaSjQnWYwjN`.
- URL del deployment: `https://grimorioapp2024-1fogz7otj-grimorio-app.vercel.app`.
- Stato finale verificato: READY, produzione, `aliasError: null`.
- Alias verificati sul deployment: `ilgrimorio.app`, `www.ilgrimorio.app`, `grimorioapp2024.vercel.app`.
- Build Vercel completata (log: `Build Completed in /vercel/output [13m]`, `Deployment completed`). Timestamp READY: `1792411626098`.
- Rollback precedente: `dpl_84A2nDQ3SbuQzSYbac5s8os2p6gk`, commit `dcb26333c56aa43e1f7bd324725ebf44168aea26`.

La preview duplicata automatica `dpl_B7ymCH7JjoXE89xejW1bqE9ECbGh`, dello stesso commit e creata da questa attività, è stata annullata per concentrare la costruzione sul rilascio richiesto.

## Contenuto e verifiche

Correzione descritta in `2026-10-19-editor-creature-campi-incantesimi.md`: riconoscimento dei nomi esatti nelle liste incantesimi senza corsivo; campi iniziativa, bonus competenza, equipaggiamento e azioni bonus modificabili, conservati e mostrati nell'anteprima.

Prima del rilascio: suite completa, test mirati DOM/PostgreSQL e build locale riusciti. Nessuno script di modifica di Mind Flayer/Mimic o migrazione su dati reali eseguito. La tabella opzionale per i nuovi campi verrà inizializzata da un normale salvataggio amministrativo autenticato.

Dopo il rilascio: interrogazione dei log runtime error/fatal del solo nuovo deployment, finestra 30 minuti, senza gruppi restituiti al momento del controllo. Questo non certifica assenza di problemi runtime: il traffico immediatamente successivo al rilascio può essere nullo.

Sul dispositivo di Daniele: ricaricare il sito e chiudere/riaprire un eventuale editor rimasto aperto. I campi si trovano in «Statistiche di combattimento». Per Mind Flayer 2024: iniziativa `+4 (14)`, bonus `+3`, equipaggiamento `Corazza`, da inserire attraverso il pannello dell'utente. Il riconoscimento dei tre nomi nelle liste esistenti è automatico nel rendering e non richiede riscrivere il testo.

L'accesso al sito con il browser di ChatGPT resta esplicitamente negato dall'auto-review OpenAI. Non sono stati eseguiti nuovi tentativi, accessi a host alternativi o interrogazioni dirette al database. Il rilascio viene controllato tramite i metadati di Vercel; non costituisce verifica runtime delle schede o del pannello.

## Coordinamento iPhone

Solo web. Nessun merge nel ramo `cloud/grimorio-ios-20261018`; il client iPhone resta separato. Il ramo documentale `docs/release-creature-editor-20261019` conserva questo passaggio senza modificare il commit applicativo pubblicato.
