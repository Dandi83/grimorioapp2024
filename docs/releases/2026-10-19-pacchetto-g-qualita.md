# Pacchetto G — qualità del codice — 19 ottobre 2026

Branch `chore/qualita-codice-20261019`, base `main` a `60a8271`. Punti Q1, Q3, Q4, Q6, Q7 del rapporto. Nessun cambiamento visibile.

## Q1 — codice e file inutilizzati rimossi

- `components/dice-roller.tsx`, `components/die-3d.tsx` (la pagina `/dadi` reindirizza già alla Home e resta invariata), `components/catalog-loading.tsx`.
- `public/logo.png` (900 KB) e `public/hero-atmosfera.png` (1,7 MB, la Home usa la versione `.webp`).
- Animazioni CSS dei dadi non più usate; resta solo quella d'ingresso dell'invito all'installazione.

## Q3 — file illeggibili formattati

Prettier 3 (`.prettierrc.json`, righe da 100 caratteri) applicato solo ai file scritti su righe lunghissime: statistiche (`app/api/analytics/*`, `lib/analytics*.ts`, `components/analytics-provider.tsx`, `app/admin/statistiche`), personaggi (`components/characters/*`, `lib/characters.ts`, `lib/*-sheet.ts`, ecc.), editor amministrativi e `components/manual-browser.tsx`.
Verifica: per ogni file l'albero sintattico prima e dopo è identico (ignorando spazi, a capo, virgolette e parentesi superflue, con la stessa regola sugli spazi nel JSX usata da React).

## Q4 — duplicazioni

- `lib/admin-action-helpers.ts`: `requireAdmin`, `clean`, `uniqueId` condivisi dalle azioni su incantesimi e creature.
- `revalidateSpell` riunisce i tre elenchi di pagine da aggiornare dopo un salvataggio.
- `components/use-intent-prefetch.ts`: precaricamento al tocco condiviso da `SpellRow` e `MonsterRow`.
- `components/meta-cell.tsx`: riquadro etichetta/valore condiviso dalle schede incantesimo e creatura.

## Q6 — tabelle descritte nello schema (senza migrazioni)

`lib/db/schema.ts` descrive le quattro tabelle create dal codice a runtime (`grimorio_content_editions`, `grimorio_monster_details`, `grimorio_analytics_events`, `grimorio_admin_login_failures`). Nessuna migrazione generata o eseguita; il database reale non è toccato. Le righe esportate verso PostHog ora hanno un tipo (`AnalyticsEventRow`). Il nuovo `tests/schema-runtime-tables.cjs` crea le tabelle con il codice reale su PGlite e verifica che colonne, tipi, obbligatorietà e valori predefiniti coincidano con lo schema (verificato che fallisce se si introduce una differenza).

## Q7 — dipendenze

Già aggiornate nel pacchetto A. Restano volutamente: TypeScript 5.9 (niente TypeScript 7, come deciso) e `@types/node` 22, allineato a Node 22 usato dai controlli automatici. Aggiunto Prettier 3.9.10 (solo sviluppo).

## Verifiche

- `npm test`, `test:creature-editor`, `test:catalog-performance`, `npx tsc --noEmit`: superati.
- `npm run test:e2e`: build completa (756 pagine) e 6 prove nel browser superate.
