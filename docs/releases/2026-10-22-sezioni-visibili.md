# Mostra/nascondi sezioni — 22 ottobre 2026

Ramo `feat/sezioni-visibili-20261022`, base `main` 2f27114 (Classi 2014 #63). Non unito: attende l'OK di Daniele.

## Cosa cambia nell'amministrazione
- Nuova pagina `/admin/sezioni` «Sezioni dell'app», con il collegamento «Sezioni dell'app» nella home admin.
- Una riga per ogni sezione pubblica: Incantesimi e Bestiario (menu in basso); Classi (Compendio · Personaggi); Armi, Armature, Equipaggiamento d'avventura e Strumenti (Compendio · Equipaggiamento); Oggetti magici, Condizioni e Avanzamento (Compendio).
- Sotto ogni nome: dove si trova e lo stato, «Visibile» in verde o «Nascosta» in rosso mattone.
- Pulsante occhio di 52×44 px. Visibile: occhio aperto con bordo bordeaux. Nascosta: occhio barrato su fondo #EDE3CC. Ha aria-label «Nascondi/Mostra <Sezione>» e aria-pressed.
- In alto due etichette, «N visibili» e «N nascoste». Dopo ogni tocco compare in basso la conferma scura «<Sezione> ora è nascosta/visibile».
- Il Registro modifiche ha il nuovo filtro «Sezioni dell'app». Per ogni cambio mostra sezione, nuovo stato, data e ora. Anche l'esportazione JSON ha i cambi (`sezioni_visibili`).

## Cosa vede il pubblico quando una sezione è nascosta
- La sezione sparisce:
  - dal Compendio. Un gruppo rimasto vuoto («Personaggi») non si mostra; il riquadro Equipaggiamento sparisce quando le sue quattro sezioni sono tutte nascoste;
  - dalla barra in basso (Incantesimi, Bestiario);
  - dalla pagina Equipaggiamento;
  - dalla ricerca in Home;
  - dai Preferiti (i preferiti salvati sul telefono restano);
  - dai link interni: «Incantesimi del <classe> →» sulle schede delle classi, condizioni e incantesimi citati nei testi delle schede, che restano testo semplice.
- Le pagine della sezione (elenco e schede) rispondono con 404 e noindex. Mostrano l'icona libro, «Sezione momentaneamente non disponibile», «Ci stiamo lavorando. Torna a trovarci tra un po': il link che hai aperto funzionerà di nuovo.» e il pulsante «Torna alla Home».
- Gli altri indirizzi inesistenti mostrano ora «Pagina non trovata», in italiano, con lo stesso pulsante. Prima c'era la pagina predefinita di Next.js, in inglese.
- Service worker: ogni pagina gli comunica gli indirizzi delle sezioni nascoste. Le loro copie salvate vengono cancellate e non vengono mai mostrate, anche offline o dopo un riavvio del telefono. Una pagina che risponde 404 perde la sua copia.

## Cosa vede l'amministratore
- Le sezioni nascoste restano navigabili. In cima alle loro pagine c'è una fascia #2B2118 con l'occhio barrato ambra e il testo «Nascosta · il pubblico non vede questa sezione. La vedi solo tu.», più il link «Mostra» che la rende subito di nuovo visibile.
- Nel Compendio e nella barra in basso le sezioni nascoste hanno l'etichetta «Nascosta».
- Meccanismo: le pagine pubbliche restano costruite una volta e servite dalla cache. Per l'amministratore Next.js le genera al momento con la «modalità anteprima» (draft mode). L'anteprima si accende all'accesso e a ogni tocco di un occhio, e si spegne all'uscita. Il cookie di sessione viene letto solo in anteprima, quindi le pagine pubbliche non diventano dinamiche.
- Se si era già entrati prima di questa versione, la fascia compare dopo il primo tocco su un occhio o dopo un nuovo accesso.

## Dati e sicurezza
- Due tabelle nuove, solo aggiunte, create al primo cambio (`CREATE TABLE IF NOT EXISTS`, `lib/section-visibility.ts`), come le altre tabelle dell'admin:
  - `grimorio_section_visibility`: un record per sezione (sezione, nascosta, aggiornata_il);
  - `grimorio_section_visibility_log`: un record per ogni cambio.
  Senza record una sezione è visibile, quindi di default sono tutte visibili. Se il database non è leggibile restano tutte visibili.
- Nascondere non tocca dati, correzioni, preferiti o registro: il cambio scrive solo nelle due tabelle (controllato da `tests/public-sections.cjs`).
- Azione server `setSectionVisibilityAction`, che inizia con `requireAdmin()`. Nessuna rotta pubblica cambia lo stato.
- Effetto immediato, senza nuova pubblicazione: `updateTag` sullo stato e `revalidatePath("/", "layout")` sulle pagine, perché un link a una sezione può stare in qualunque pagina. Rigenera anche l'indice della ricerca.

## Sezioni future
- Un unico registro, `lib/public-sections.ts`: chiave, titolo, posizione e indirizzi. Una sezione nuova si aggiunge lì e nasce con il suo interruttore.
- Le sue pagine si proteggono con un `layout.tsx` che usa `<SectionGate section="…">`. `tests/public-sections.cjs` fallisce se una sezione del registro non ha il suo layout.

## Verifiche
- Test unitari:
  - `tests/public-sections.cjs`: registro, riconoscimento degli indirizzi, layout di ogni sezione, stessa regola nel service worker, tabelle scritte;
  - `tests/admin-access.cjs`: solo l'amministratore cambia lo stato, registro, anteprima accesa all'accesso e spenta all'uscita;
  - `tests/service-worker.cjs`: copie delle sezioni nascoste;
  - `tests/search.cjs`: ricerca senza le sezioni nascoste;
  - `tests/schema-runtime-tables.cjs`: tabelle.
- Prova nel browser «sections of the app»:
  - ognuna delle 10 sezioni nascosta e rimostrata: 404 con il messaggio per elenco e scheda, fascia e «Mostra» per l'amministratore;
  - Compendio senza gruppi vuoti, barra in basso, ricerca, link interni, Registro;
  - 360/375/390 px senza scorrimento orizzontale; pulsanti 52×44 e tocchi da almeno 44 px.
