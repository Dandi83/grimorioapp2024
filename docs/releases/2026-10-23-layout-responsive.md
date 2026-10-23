# Layout responsive per tablet e computer — 23 ottobre 2026

Ramo `feat/responsive-tablet-desktop-20261023`, base `main` b84212e (#69). Non unito: attende l'OK di Daniele.

## Telefono (< 768 px): invariato
Il lavoro nuovo usa solo i prefissi `md:` (≥768) e `lg:` (≥1024), una container query della scheda del mostro (≥820 px di spazio) e regole CSS dentro `@media (min-width: 1024px)`. Le schermate a 390×844 di Home, /grimorio, /spell/dardo-incantato, /bestiario, /mostro/aboleth, /compendio, /classi e /admin sono identiche byte per byte a quelle di main: stessa build con il database di prova, confronto dei pixel con sharp.

## Tablet (768–1023 px)
- Contenuto più largo (fino a max-w-4xl, 40 px ai lati), barra in basso centrata di 620 px.
- Riquadri su 3 colonne con min-height 150 px e raggio 16 px: Compendio, Equipaggiamento e le altre pagine con `SectionTiles`. Le Classi vanno su 3 colonne (4 sul computer).

## Computer (≥1024 px)
- **Colonna laterale** di 240 px (`components/side-nav.tsx`):
  - logo, le 5 voci (icona 20 px, altezza 46 px, attiva bordeaux) e in fondo Segnala un errore, Area riservata, Termini e condizioni, Privacy;
  - le voci vengono da `components/nav-items.ts`, condiviso con la barra: sezioni nascoste fuori da entrambe, «Nascosta» per l'admin;
  - niente colonna in /admin; senza la colonna il contenuto si centra fino a circa 1200 px.
- **Elenco + scheda affiancati** (`components/layout/catalog-split.tsx`), elenco a sinistra di 400 px per gli incantesimi e di 320 px per il bestiario:
  - il componente vive nel layout radice, tramite `components/layout/content-frame.tsx`, e resta montato tra /grimorio ↔ /spell/… e /bestiario ↔ /mostro/…: ricerca, filtri, edizione e scorrimento dell'elenco restano, e un clic cambia solo la scheda;
  - l'elenco legge i filtri dall'indirizzo solo sulla propria pagina, così aprire una scheda non li azzera;
  - sul computer l'elenco si scarica da `/api/catalogo/incantesimi` o `/api/catalogo/bestiario`: stessi dati della pagina, 404 se la sezione è nascosta. Il telefono non lo scarica mai, quindi le schede non diventano più pesanti;
  - /grimorio e /bestiario mostrano il pannello vuoto («Scegli un incantesimo dall'elenco»); gli indirizzi restano gli stessi.
- **Scheda del mostro**:
  - su due colonne quando ha almeno 820 px: a sinistra CA (con Iniziativa), PF (con dadi), Velocità, Caratteristiche e Tratti; a destra Azioni, Azioni bonus, Reazioni, Azioni leggendarie; la Descrizione sotto, a tutta larghezza;
  - sull'iPad orizzontale (1194 px) la scheda ha meno spazio e resta su una colonna;
  - nome a 46 px e pillola «GS · PE» bordeaux.
- **Home**: copertina a tutta area con velo scuro da sinistra, frase a 64 px con «magie.» in ambra, ricerca alta 60 px, scorciatoie «Incantesimi · N», «Bestiario · N» e «Compendio» con i numeri reali (edizioni e raccolte nascoste escluse), ⌘K/Ctrl+K che apre la ricerca.
- **Pagine di lettura** (manuale, Termini, Privacy, Segnala): circa 760 px. Le altre pagine sono centrate fino a 1040 px.
- **Admin**: contenuto fino a 1200 px, riquadri su 4 colonne, selettore e fascia dell'edizione invariati nel funzionamento (larghi come il contenuto).
- **Service worker e PWA**: invariati. L'avviso offline resta sopra il contenuto, a destra della colonna.
