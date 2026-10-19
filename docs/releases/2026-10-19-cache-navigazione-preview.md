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

Anteprima del branch: https://grimorioapp2024-git-perf-lista-incantesimi-grimorio-app.vercel.app. Codice pubblicato nel commit `794f55beeec06c6420b49abf7541a758aac1710c`, deployment `dpl_HAaKMhEhPMy4ovScJscmsWysnXBR` READY, target preview, regione `iad1`. Build Vercel completata: elenchi marcati statici con revalidate 5m; schede marcate SSG on demand. URL immutabile: https://grimorioapp2024-80r6m98us-grimorio-app.vercel.app. Nessun merge o deploy produzione autorizzato/eseguito. Nessuna prova fisica iPhone ancora effettuata.


## Verifiche HTTP della preview

GET ripetute, senza credenziali né invio eventi:

| Percorso | Primo accesso | Secondo accesso |
| --- | --- | --- |
| /grimorio | 200 PRERENDER | 200 HIT |
| /bestiario | 200 PRERENDER | 200 HIT |
| /preferiti | 200 PRERENDER | 200 HIT |
| /spell/colpo-accurato | 200 MISS | 200 HIT |
| /mostro/aboleth | 200 MISS | 200 HIT |

La produzione è stata ricontrollata dopo la pubblicazione della preview: invariata a `59c5ffb`, alias ufficiali ancora sul deployment precedente.

La prova aggiuntiva Playwright non è partita: il pacchetto è disponibile ma Chromium non è installato nell'ambiente. Nessun browser o dipendenza installati. I controlli DOM coprono i filtri client e i Preferiti; la persistenza Router Cache nel browser e la fluidità su iPhone fisico restano da verificare. I tempi HTTP includono la rete/proxy di questo ambiente e non sono un benchmark prestazionale.

## File modificati o creati rispetto a b0579c4

- `app/actions/admin-monsters.ts`
- `app/bestiario/page.tsx`
- `app/grimorio/page.tsx`
- `app/mostro/[id]/page.tsx`
- `app/preferiti/page.tsx`
- `app/spell/[id]/page.tsx`
- `components/bottom-nav.tsx`
- `components/catalog-browsers.tsx (nuovo)`
- `components/favorites-list.tsx`
- `components/monster-row.tsx`
- `next.config.mjs`
- `scripts/check-monster-favorites.mjs`
- `scripts/check-navigation.mjs`
- `tests/admin-editor-editions.cjs`
- `tests/bestiario-browser-dom.cjs`
- `tests/catalog-list-payload.cjs`
- `docs/continuita-progetto.md`
- `docs/releases/2026-10-19-cache-navigazione-preview.md (nuovo)`
- `docs/superpowers/plans/2026-10-19-navigation-cache.md (nuovo)`
