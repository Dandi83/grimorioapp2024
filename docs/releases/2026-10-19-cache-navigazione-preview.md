# Cache navigazione e schede — solo anteprima

Base: `b0579c4`, branch `perf/lista-incantesimi`. Produzione verificata e da conservare: `59c5ffbd59e4ab8feec702ce6a9a227cc66c118b` / `dpl_Hf6MBCyxEghp1U1bEUe7Hg93kPRp`. Base mobile remota `e22f06e`, non integrata.

## Modifiche

- Router Cache: `experimental.staleTimes` statico e dinamico a 300 secondi. Opzione sperimentale, da validare in questa preview.
- `/grimorio`, `/bestiario`, `/preferiti`: prerendering e ISR a 300 secondi. I filtri URL passano a client con `useSearchParams` dentro Suspense; il cambio query sullo stesso percorso reinizializza i filtri. Ricerca, paginazione e preferiti rimangono locali.
- Preferiti riceve soltanto l'indice incantesimi e i campi elenco delle creature. Nessun ID preferito personale entra nella pagina statica.
- `/spell/[id]` e `/mostro/[id]`: ISR a 300 secondi, generazione alla prima visita tramite `generateStaticParams()` vuoto. Metadati e pagina continuano a condividere la lettura con React.cache. Nessuna lettura completa di tutte le schede in build.
- Salvataggi, creazioni ed edizioni conservano `revalidatePath`; la cancellazione di una creatura ora invalida anche la sua scheda. I salvataggi incantesimi continuano a invalidare il tag `spells` dell'indice (TTL indice 3600 secondi, invariato).
- Prefetch completo per i quattro link della barra. Righe incantesimi e creature con prefetch automatico disattivato, evitando richieste per centinaia di schede.

I 300 secondi sono una scelta operativa dichiarata in questa sessione: il testo integrale della richiesta precedente non è stato recuperato. ISR può servire una risposta scaduta mentre rigenera in background. Una scheda già presente nella Router Cache di un altro visitatore non riceve aggiornamenti push: può restare fino alla scadenza o al refresh.

## Verifiche locali

Eseguite nell'ordine: `npx tsc --noEmit` PASS, `npm run test:catalog-performance` PASS, `npm test` PASS (compreso posttest RSC). `git diff --check` PASS. Lint escluso, nessuna dipendenza installata.

Il primo tsc della nuova worktree richiedeva la generazione standard `next typegen` per `next-env.d.ts`. Non sono state cambiate configurazioni TypeScript per nascondere errori.

Test adattati al nuovo comportamento:
- `tests/catalog-list-payload.cjs`: attraversa Suspense; conserva ID, metadati, 100 animali, record manuali e assenza di corpi completi. Verifica anche il payload Preferiti.
- `scripts/check-monster-favorites.mjs`: simula getSpellIndex invece di getAllSpells; invariati namespace, preferiti misti, ordinamento e persistenza dei dati.
- `scripts/check-navigation.mjs`: il doppio di Link gestisce prefetch e verifica prefetch=true per la barra.
- `tests/bestiario-browser-dom.cjs`: aggiunge URL iniziali, query modificata sullo stesso percorso, livello invalido, raccolta/GS e reset a URL senza filtri.
- `tests/admin-editor-editions.cjs`: verifica invalidazione della scheda dopo cancellazione su database di prova PGlite.

Revisione indipendente del diff: nessun problema sostanziale individuato. Nessuna scrittura amministrativa o migrazione su database reale.

## Regioni e pubblicazione

Verificati deployment produzione e precedente preview: regione funzioni Vercel `iad1`. Il solo hostname PGHOST dell'integrazione Neon indica `us-east-1.aws.neon.tech`. Sono coerenti in Virginia; nessuna modifica geografica o migrazione.

Anteprima del branch: https://grimorioapp2024-git-perf-lista-incantesimi-grimorio-app.vercel.app. Build e controlli HTTP del nuovo commit da registrare dopo il deploy. Nessun merge o deploy produzione autorizzato/eseguito. Nessuna prova fisica iPhone ancora effettuata.
