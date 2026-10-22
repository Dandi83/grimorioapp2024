# Icone nella home admin e parti delle sezioni — 22 ottobre 2026

Ramo `feat/admin-icone-20261022`, base `main` 07b9a59 (Mostra/nascondi sezioni #64). Non unito: attende l'OK di Daniele.

## A) Home admin (/admin)
- Icone lucide (24 px, tratto 1.8, #7A1F2B, aria-hidden) a sinistra del titolo dei riquadri:
  - Incantesimi Sparkles, Mostri Skull, Armi Sword, Armature Shield, Equipaggiamento Backpack, Strumenti Hammer;
  - Oggetti magici Gem, Classi Shield (la stessa del Compendio), Condizioni HeartPulse, Manuale BookOpen.
- Icone da 18 px nei pulsanti in basso: Sezioni dell'app Eye, Segnalazioni MessageSquareWarning, Registro modifiche History, Statistiche BarChart3.
- Etichette in alto a destra dei riquadri:
  - «Nascosta» (fondo #2B2118, testo #E0A21A, 11 px grassetto) per una sezione nascosta, anche quando lo è perché sono nascoste tutte le sue edizioni o tutti i suoi blocchi;
  - «Parti nascoste» (bordo e testo #2B2118) quando è nascosta solo qualche parte.
- Nessun interruttore nella home.

## B) Parti delle sezioni
Si registrano in `lib/public-sections.ts`, accanto alle sezioni (`parts`: chiave, nome, gruppo, insieme, pagina d'esempio). In tutto 35 parti:
- **Edizioni** (2014 e 2024): Incantesimi, Bestiario, Classi, Armi, Armature, Equipaggiamento d'avventura, Strumenti, Oggetti magici, Condizioni.
- **Raccolte e schede**:
  - Bestiario: Raccolta Mostri, Raccolta Animali;
  - Classi: Tab Tabella, Tab Sottoclasse, Riga «Diventare un…», Pulsante «Incantesimi del…»; in più, trovate nella pagina, Riga «Abilità ed equipaggiamento iniziale» e Lista degli incantesimi;
  - Riquadro «2014 → 2024» in Armi, Strumenti, Equipaggiamento d'avventura e, in più, Oggetti magici.
- **Blocchi**:
  - Avanzamento: Tabella di avanzamento, Punti ferita fissi per classe, Talenti bonus oltre il 20º livello, Calcolatore di PE;
  - in più, Equipaggiamento d'avventura: Blocco «Dotazioni».
- Non sono parti:
  - i paragrafi dei manuali dentro una scheda (Utilizzo, Varianti, Proprietà…);
  - i gruppi degli elenchi (Semplici da mischia…), che sono solo un ordinamento;
  - «Tutti gli oggetti» in Equipaggiamento d'avventura, che è l'elenco stesso.

## Regole
- Parte nascosta: per il pubblico non viene disegnata (niente spazio vuoto, nessun link) ed è esclusa dalla ricerca. L'amministratore la vede con «Nascosta» (e «Mostra» sui blocchi e sulle schede).
- Edizione nascosta:
  - il selettore 2024 · 2014 e i link «Passa alla versione …» spariscono, gli elenchi e la ricerca mostrano solo l'altra edizione;
  - le schede di quell'edizione danno 404 con «Sezione momentaneamente non disponibile»; il pannello nascosto non è nemmeno nella pagina;
  - se il telefono aveva memorizzato l'edizione nascosta, il sito usa l'altra;
  - i riquadri «2014 → 2024» spariscono, perché mostrerebbero l'edizione nascosta, e così la nota delle Condizioni 2014 che rimanda alle pagine 2024.
- Tutte le parti di un insieme nascoste (le due edizioni, le due raccolte, i quattro blocchi di Avanzamento): la sezione si comporta come nascosta. Esce da Compendio, barra e ricerca, le pagine danno 404, e la fascia admin offre «Mostra», che rimostra quelle parti.
- La sezione nascosta vince sulle parti e le conserva: rimostrandola, le parti nascoste restano nascoste.
- Preferiti: niente incantesimi o creature di edizioni o raccolte nascoste (i preferiti salvati restano).
- Service worker: ogni pagina gli manda l'elenco delle parti nascoste per sezione. Quando cambia, le copie salvate prima vengono cancellate.

## Dati e sicurezza
- Due tabelle nuove, solo aggiunte, create al primo cambio:
  - `grimorio_section_parts`: un record per parte;
  - `grimorio_section_parts_log`: un record per ogni cambio.
- Di default tutto è visibile.
- Azioni server `setPartVisibilityAction`, `showPartAction` e «Mostra» della fascia, tutte con `requireAdmin`. Stesso aggiornamento di cache e indice della ricerca delle sezioni.
- Registro modifiche: «Sezione · Parte · visibilità», con nuovo stato, data e ora; anche nell'esportazione JSON.
- /admin/sezioni:
  - sotto ogni sezione con parti, la riga «N parti ›»; aperta, mostra le parti per gruppo, rientrate, con stato e occhio 52×44;
  - in alto, «N parti nascoste» accanto ai contatori delle sezioni.

## Verifiche
- Test unitari: `tests/public-sections.cjs` (registro, insiemi, sezione che vince, indirizzi delle edizioni), `admin-access`, `service-worker`, `search`, `schema-runtime-tables`, `check-monster-favorites`.
- Prova nel browser «parts of the sections»:
  - ogni parte registrata esiste nella sua pagina;
  - edizione nascosta (selettore, edizione memorizzata, schede 404, link, ricerca, admin);
  - sezione che vince; riquadro «2014 → 2024», Dotazioni, Animali; parti della scheda classe; edizioni delle Condizioni tutte nascoste; blocchi di Avanzamento uno a uno e tutti;
  - registro; 360/375/390 px senza scorrimento orizzontale e tocchi da almeno 44 px.
