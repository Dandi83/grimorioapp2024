# «I miei personaggi», pagina beta solo admin (PROMPT 62, 5 novembre 2026)

Passo G3 dell'integrazione con Total Party Kill (TPK): TPK crea i personaggi, il Grimorio li riceve dal link, li salva nel browser e li mostra.

## Sezione
- `lib/public-sections.ts`: nuova sezione `personaggi` («I miei personaggi», percorso `/personaggi`, `beta: true`).
- `lib/section-visibility.ts`: stato di partenza «Nascosta» (`DEFAULT_SECTION_STATES`).
- Si gestisce da /admin/sezioni come le altre, con l'etichetta BETA; «Nascondi tutto» la copre.
- `app/personaggi/layout.tsx` usa `SectionGate`. Anche la pagina controlla lo stato: la 404 del pubblico non contiene né il titolo né i dati della pagina.
- Per il pubblico non c'è nessuna voce in menu, Compendio, ricerca, sitemap o service worker; robots tiene `/personaggi` in Disallow.

## Pagina
È un guscio: tutto avviene nel browser (`components/characters-beta/characters-app.tsx`, `lib/characters-beta.ts`). Nessuna API, nessun dato inviato al server, nessuna scrittura ISR. Il server passa solo i nomi delle pagine del Grimorio: incantesimi 2024, talenti e sottoclassi SRD 5.2.1. Il codice della pagina e di `lib/shared/scheda-tpk-v1.ts`, che resta invariato, sta in un chunk usato solo da /personaggi.

1. **Elenco**:
   - titolo con BETA e il riquadro tratteggiato «Salvati solo su questo telefono…»;
   - una card per personaggio: icona della classe (12 icone lucide), nome, «Classe · Specie (opzione) · N° livello», freccia;
   - «＋ Crea il tuo personaggio» apre `https://total-party-kill.vercel.app/crea?ritorno=grimorio` in una nuova scheda;
   - se non ci sono personaggi, un breve invito a crearne uno.
2. **Personaggio ricevuto** (`#pg=`, `#pg0=`, `#party=`, `#party0=`; letto con `decodeHash`, controllato con `validaScheda`):
   - riepilogo del personaggio e sezione «Controlli» con le spunte;
   - «Valori calcolati da TPK»;
   - «Salva» e «Annulla»: dopo l'una o l'altra il «#…» sparisce dall'indirizzo;
   - con un nome e una classe già salvati chiede «Sostituisci» o «Salva come nuovo»;
   - un link rovinato mostra l'errore in italiano.
3. **Scheda**:
   - la classe è un link a /classi/<id>. Specie e background restano testo, perché le loro pagine del manuale non sono pubbliche;
   - riquadri PF, CA, CD, INIZ. e M, con sotto «calcolati da Total Party Kill»;
   - 6 caratteristiche: base + bonus del background, più l'eventuale «Aumento dei punteggi di caratteristica»;
   - talenti come link a /talenti/<id> e incantesimi come link a /spell/<id>: i primi 5, poi «+N»;
   - «Gioca in TPK» (`/importa#pg=…`, nuova scheda), «Copia il link» (`https://ilgrimorio.app/personaggi#pg=…`) ed «Elimina» con conferma.

## Salvataggio
- Si salva in `localStorage`, chiave `grimorio.characters.v1`, separata dai preferiti.
- Ogni voce contiene `{ id, savedAt, sheet }`: `sheet` è la scheda v1 così com'è, `calc` compreso; l'id è generato dal Grimorio.
- Tutte le letture e le scritture sono protette: se il browser non permette di salvare (finestra privata), la pagina funziona lo stesso e lo dice.

## Statistiche
Usano solo il percorso, mai il «#…», e /personaggi non è contata. Lo verificano `tests/personaggi-beta.cjs` e l'e2e.

## Prova «Ultime 24 ore» stabile
La finestra finisce al minuto attuale, che è escluso: nel primo minuto di ogni ora un evento «alle hh:00» dell'ora corrente cade fuori dal grafico. È così che la prova era fallita alle 15:00 del 5 novembre.
- La prova ora segna l'evento due ore prima, con il giorno giusto anche prima delle 02:00.
- L'evento viene cancellato anche se la prova si ferma (`afterEach`, anche in `statistiche.spec`).
- `tests/analytics-stats.cjs` controlla il bordo con un orologio fisso (14:00:30, 14:59:59, 00:30 UTC).
