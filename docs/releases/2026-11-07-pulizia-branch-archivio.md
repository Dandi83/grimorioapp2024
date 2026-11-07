# «Pulizia branch»: modalità «archivia-prova» e «archivia-ed-elimina» (PROMPT 74, 7 novembre 2026)

Solo il workflow manuale «Pulizia branch uniti» (`.github/workflows/pulizia-branch.yml`,
`.github/scripts/pulizia-branch.sh`). Il codice dell'app, Vercel, le variabili e le impostazioni del repository
(protezione dei branch, «Automatically delete head branches») non cambiano. Nessuna chiave: solo il `GITHUB_TOKEN`
automatico, come prima. Il workflow non è stato lanciato in questo passaggio.

## Il problema
«prova» ed «elimina» (PROMPT 42) cancellano solo i branch già uniti in main. Nel repository restano branch non
uniti e senza PR utili, che nessuno vuole più ma che conviene poter ritrovare.

## Cosa cambia
- Campo «modalita»: oltre a «prova» (predefinita) ed «elimina», identiche a prima, le opzioni **«archivia-prova»**
  e **«archivia-ed-elimina»**.
- Nuovo campo facoltativo **«branch»**: elenco esplicito di nomi separati da virgola, spazio o a capo. Obbligatorio
  per le due modalità nuove (vuoto: errore, uscita 2 e nessuna chiamata a GitHub); ignorato da «prova» ed «elimina».
- Per ogni nome dell'elenco:
  - rifiutato sempre, senza toccare nulla: `main`; branch protetto; `cloud/…` (filone iPhone); branch con una PR
    aperta; nome che non esiste o non valido;
  - altrimenti tag d'archivio **`archivio/<nome-branch>`** (barre comprese) sull'ultimo commit attuale:
    «archivia-prova» mostra solo cosa farebbe; «archivia-ed-elimina» crea il tag se manca (già presente sullo
    stesso commit: va bene; su un altro commit: branch rifiutato), **rilegge il tag da GitHub**, rilegge il branch
    (stesso commit, non protetto, nessuna PR aperta nel frattempo) e solo allora cancella il branch. Un tag
    annotato si risolve al commit. Nessun tag viene mai cancellato o spostato: se un controllo cade, restano tutti
    e due.
- Riepilogo (`GITHUB_STEP_SUMMARY` e log): una tabella per branch con nome, ultimo commit, tag (creato / già
  presente / da creare) ed esito (eliminato / da eliminare / rifiutato con il motivo); in fondo i totali.

## Prove senza GitHub
`tests/pulizia-branch.cjs` (in `npm test`) esegue lo script con un finto `gh` messo davanti nel `PATH`
(`tests/fixtures/pulizia-branch-gh.cjs`): risponde da uno stato JSON, registra ogni chiamata e applica le scritture
allo stato. Controlla: «prova» ed «elimina» invariati (e il campo «branch» ignorato); elenco vuoto → errore senza
chiamate; main, `cloud/…`, protetto, PR aperta, inesistente, nome non valido → rifiutati; «archivia-prova» non
scrive; «archivia-ed-elimina» crea il tag, lo rilegge, ricontrolla il branch e solo dopo cancella (ordine
verificato nel registro delle chiamate); tag esistente su un altro commit → rifiutato; tag che non si rilegge → il
branch resta; branch cambiato nel frattempo → resta, tag intatto; mai un `DELETE` o `PATCH` su un tag.

## Come lanciarlo (dopo il merge, decisione della chat di coordinamento)
Actions → «Pulizia branch uniti» → Run workflow → «modalita» = `archivia-prova`, «branch» = i nomi, per esempio
`feature/vecchia, prova-2026-10-02 ui/esperimento`; letta la tabella, di nuovo con `archivia-ed-elimina` e lo stesso
elenco. Un branch si ricrea dal tag con `git checkout -b <nome> archivio/<nome>`.
