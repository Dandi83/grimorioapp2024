# Invito a installare il Grimorio per chi arriva da Total Party Kill (PROMPT 70, 6 novembre 2026)

Le due app si «presentano» a vicenda: chi apre una pagina del Grimorio con `?da=tpk` e non ha il Grimorio installato
vede subito un invito a installarlo; tutti i link del Grimorio verso TPK portano `da=grimorio`.

## Come appare

Riquadro in basso, appoggiato sopra la barra di navigazione (mai sopra la barra), fondo crema (`bg-card`, #FFFBF0),
bordo bordeaux sottile, angoli in alto arrotondati, icona del Grimorio, titolo in EB Garamond.

- Titolo: «Installa Il Grimorio.App».
- Riga: «Arrivi da Total Party Kill: tieni il Grimorio sempre a portata di mano, anche offline.»
- Pulsanti: «Non ora», «Installa», ✕ (area di tocco 44 × 44 px).

Cosa fa «Installa» (`tpkInvite` in `lib/install-guide.ts`):

| Sistema | Variante | «Installa» |
| --- | --- | --- |
| Android e computer con `beforeinstallprompt` (Chrome, Edge, Samsung Internet, Opera) | `prompt` | apre la finestra di installazione del browser |
| iPhone e iPad in Safari | `ios-safari` | guida: 1. «Tocca Condividi ⬆ nella barra di Safari», 2. «Scorri e scegli «Aggiungi alla schermata Home»», 3. «Tocca «Aggiungi»»; freccia animata verso Condividi (in basso al centro su iPhone, in alto a destra su iPad), ferma con «riduci movimento»; «Ho capito» chiude |
| iPhone e iPad in Chrome, Edge, Firefox, Opera o dentro un'app (Instagram, Facebook, Messenger, WhatsApp, browser interni come quello di Claude) | `ios-altro` | prima «Apri questa pagina in Safari» con il gesto dell'app quando c'è (Instagram: ⋯ → «Apri nel browser»; Facebook/Messenger: ⋯ → «Apri nel browser esterno»; altre app: ⋯ o la bussola → «Apri in Safari»; Chrome/Firefox/Edge: copia il link e incollalo in Safari) e «Copia il link» dell'indirizzo senza `da=tpk`, poi gli stessi 3 passi |
| Firefox su Android | `steps` | «Apri il menu ⋮ … Scegli «Installa»» |
| Safari su Mac (17 o successivo) | `steps` | «Nel menu Archivio (File) scegli «Aggiungi al Dock»» |
| Altri browser Android senza l'evento | `steps` | i passi del loro menu (come /installa) |
| App dentro Android (WhatsApp, Telegram…) | `inapp` | «Apri nel browser» + «Copia il link» |
| Firefox su computer, Chrome/Edge su computer senza l'evento, Safari Mac 16 | `none` | nessun riquadro |

## Regole

- Stesso riconoscimento del browser e dello stato installato dell'avviso «Installala» (`components/install/install-events.ts`):
  mai con `display-mode: standalone` (o le altre modalità app) né con `navigator.standalone` su iOS.
- Compare appena la pagina è pronta, senza aspettare il primo gesto. È fisso: non sposta il contenuto.
- Mai due riquadri insieme: aspetta la barra delle statistiche, la schermata «Scegli l'edizione» e la domanda «Come ti trovi?»
  (`components/statistics/notice.ts`); finché è dovuto, la domanda e la card «Sostieni» aspettano lui.
- «Non ora» e ✕: chiudono per 7 giorni, con lo stesso promemoria dell'avviso normale (`grimorio-install-dismissed`).
  «Ho capito» chiude la guida per la pagina aperta. Mai su /installa.
- `da=tpk` si legge una volta (`lib/tpk-arrival.ts`, appena gira il codice della pagina) e si toglie dall'indirizzo con
  `history.replaceState`, senza ricaricare. Canonical, sitemap e pagine statiche invariati. Non si salva nulla: una visita
  successiva senza segno è una visita normale.
- Senza `da=tpk` tutto come prima (l'avviso «Installala» al primo gesto).

## Edizione

Chi arriva con `da=tpk` e non ha ancora scelto un'edizione riceve il 2024, salvato come sua scelta, senza la schermata
«Scegli l'edizione»; si cambia dalla pillola. Chi ha già scelto tiene la sua scelta.

## Statistiche

- «Da dove arrivano»: nuova origine «Total Party Kill» (`tpk` in `ORIGINS`), da `?da=tpk` o da un link di totalpartykill.app.
- Eventi (`TPK_INVITE_EVENTS`, accettati da ogni pagina pubblica, con il solo tipo di dispositivo): `tpk_invite_shown`,
  `tpk_invite_tapped`, `tpk_invite_guide` (guida iPhone/iPad aperta), `tpk_invite_installed` (finestra del browser
  accettata), `tpk_invite_closed`. Partono subito (non aspettano la pagina successiva).
- /admin/statistiche → Approfondimenti → «Funzioni»: tabella «Invito «da Total Party Kill»» (24 ore, 7 giorni) accanto a
  «Riquadro «Installala»». «Installata» conta la finestra accettata e `app_installed` di chi ha visto l'invito. Limite: su
  iPhone l'app sulla schermata Home ha un archivio suo, quindi la prima apertura dall'icona non si collega alla visita da TPK.

## Link verso TPK (`lib/tpk.ts`)

- «＋ Crea il tuo personaggio»: `https://www.totalpartykill.app/crea?ritorno=grimorio&da=grimorio`
- «Gioca in Total Party Kill»: `https://www.totalpartykill.app/importa?da=grimorio#pg=…` (il `#pg=` resta dopo i parametri)
- «⚔ Affrontalo in Total Party Kill»: `https://www.totalpartykill.app/evoca?mostro=<id>&da=grimorio` (come nel PROMPT 69)

## Prove

- `tests/invito-tpk.cjs` (in `npm test`): link, varianti per sistema, segno tolto, edizione, origine, eventi.
- `e2e/invito-tpk.spec.mjs` (Chromium: Android, Firefox Android, computer, barra statistiche) e
  `e2e/invito-tpk-iphone.spec.mjs` (WebKit: iPhone, iPad, Chrome iOS, Instagram, app installata, riduci movimento).
