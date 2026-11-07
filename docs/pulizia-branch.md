# Pulizia dei branch (PROMPT 42, PROMPT 74)

Azione GitHub lanciata solo a mano, con quattro modalità. Non tocca mai `main`, i branch protetti, quelli con una PR
ancora aperta e il filone iPhone (`cloud/…`). Nessun tag viene mai cancellato o spostato.

## Come lanciarla
1. Su GitHub apri il repository → **Actions** → **Pulizia branch uniti** (colonna a sinistra).
2. **Run workflow** → nel campo «modalita» scegli:
   - **prova** (predefinita): non elimina nulla; nel riepilogo dell'esecuzione trovi le tabelle «Da eliminare»
     (branch, motivo, PR) e «Tenuti» (branch, motivo);
   - **elimina**: rifà gli stessi controlli, ricontrolla ogni branch subito prima e cancella solo quelli uniti; nel
     riepilogo il numero degli eliminati e la lista dei tenuti;
   - **archivia-prova** (PROMPT 74): per l'elenco del campo «branch» mostra cosa farebbe «archivia-ed-elimina»
     (tag da creare o già presente, branch da eliminare, rifiuti con il motivo) senza scrivere nulla;
   - **archivia-ed-elimina** (PROMPT 74): per ogni branch dell'elenco crea il tag d'archivio
     `archivio/<nome-branch>` sull'ultimo commit attuale del branch e poi cancella il branch.
3. Campo «branch» (solo per le due modalità «archivia-…», obbligatorio: vuoto = errore e nessuna azione; «prova» ed
   «elimina» lo ignorano): i nomi dei branch separati da virgola, spazio o a capo, per esempio
   `feature/vecchia, prova-2026-10-02 ui/esperimento`. I doppioni contano una volta.
4. Conviene lanciare prima «prova» o «archivia-prova», leggere le tabelle, poi «elimina» o «archivia-ed-elimina».

## Quando un branch è «unito» («prova» ed «elimina»)
- una PR chiusa con merge ha quel branch come origine e lo stesso ultimo commit che il branch ha adesso; oppure
- l'ultimo commit del branch è già contenuto in main (confronto GitHub «behind» o «identical»).

## Archivio ed eliminazione («archivia-prova» e «archivia-ed-elimina»)
Per ogni nome dell'elenco, nell'ordine scritto:
1. rifiutato sempre, senza toccare nulla: `main`; un branch protetto; un `cloud/…` (regola «Coordinamento
   permanente web / iPhone» di AGENTS.md); un branch con una PR aperta; un nome che non esiste (o non valido);
2. tag `archivio/<nome-branch>` (stesso nome del branch, barre comprese) sull'ultimo commit attuale del branch: se il
   tag esiste già e punta allo stesso commit va bene; se punta a un altro commit il branch è rifiutato;
3. solo in «archivia-ed-elimina»: il tag viene creato se manca, poi **riletto da GitHub**; il branch viene riletto
   (stesso commit, non protetto, nessuna PR aperta nel frattempo) e cancellato **solo** se il tag esiste davvero e
   punta all'ultimo commit attuale. Se un controllo cade, il branch resta e il tag resta (mai cancellato o spostato).

Il riepilogo dell'esecuzione (e il log) ha una tabella per branch: nome, ultimo commit, tag (creato / già presente /
da creare) ed esito (eliminato / da eliminare / rifiutato con il motivo); in fondo i totali. Il tag si vede su
GitHub in **Tags** e il branch si può ricreare da lì (`git checkout -b <nome> archivio/<nome>`).

## Come è fatta
- `.github/workflows/pulizia-branch.yml`: avvio solo manuale, permessi `contents: write` e `pull-requests: read`,
  solo il token automatico di GitHub (nessun segreto), `actions/checkout` fissato allo SHA completo.
- `.github/scripts/pulizia-branch.sh`: solo API REST (`gh api`), nessuna GraphQL. Variabili `MODALITA`,
  `BRANCH_LIST`, `GITHUB_REPOSITORY`, `GITHUB_STEP_SUMMARY`.
- Prove senza GitHub: `tests/pulizia-branch.cjs` (in `npm test`) esegue lo script con un finto `gh`
  (`tests/fixtures/pulizia-branch-gh.cjs`) che risponde da uno stato in memoria e registra ogni chiamata.
