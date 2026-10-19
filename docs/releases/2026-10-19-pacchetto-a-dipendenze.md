# Pacchetto A — aggiornamenti di sicurezza e dipendenze — 19 ottobre 2026

Branch `deps/aggiornamenti-sicurezza-20261019`, base `main` a `f698db9`. Nessun cambiamento funzionale o grafico atteso.

## Aggiornamenti

| Pacchetto | Prima | Dopo |
|---|---|---|
| next | 16.3.4 | 16.4.2 (corregge gli avvisi di sicurezza, tra cui SSRF nell'ottimizzatore immagini e cache poisoning ISR) |
| react / react-dom | 19.1.1 | 19.3.1 |
| drizzle-orm | 0.45.2 | 0.45.4 |
| pg | 8.23.0 | 8.23.1 |
| lucide-react | 1.43.0 | 1.59.0 |
| tailwindcss / @tailwindcss/postcss | 4.1.13 | 4.3.3 |
| @types/react / @types/react-dom | 19.1.x | 19.3.0 |
| @types/node | 22.10.2 | 22.20.5 (resta sulla linea 22) |
| jsdom (solo test) | 26.1.0 | 29.1.1 |
| sharp, source-map-js (indirette) | versioni vulnerabili | corrette con `npm audit fix` |

Escluso su indicazione di Daniele: TypeScript 7 (resta 5.9.3).

## Verifiche

- `npm audit`: 0 vulnerabilità (prima: 1 critica, 2 alte).
- `npm test`, `test:catalog-performance`, `test:creature-editor`, `tests/character-dashboard.cjs`: superati.
- `npx tsc --noEmit`: superato.
- `npm run build` (Next 16.4.2, Turbopack): compilazione e TypeScript riusciti; raccolta dati ferma per assenza di `DATABASE_URL` in ambiente cloud, build completa su anteprima Vercel.
- CSS Tailwind 4.1.13 e 4.3.3 confrontati compilando `app/globals.css`: stesse regole e stessi valori; cambiano solo la forma (annidamento appiattito, `@media (hover: hover)` raggruppato, `calc(var(--spacing) * 0)` scritto come `0px`).
