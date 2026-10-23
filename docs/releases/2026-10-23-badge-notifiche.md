# Badge con il numero sull'icona dell'app — 23 ottobre 2026

Ramo `feat/badge-notifiche-20261023`, base `main` 6754e11 (#66).

## Cosa fa
- Sull'icona del Grimorio nella schermata Home compare il numero delle segnalazioni con stato «nuova», cioè non ancora aperte. È lo stesso numero del riquadro «segnalazioni nuove» di /admin.
- Si usa la Badging API: `setAppBadge` e `clearAppBadge`. Su iPhone funziona da iOS 16.4, per i siti aggiunti alla schermata Home con le notifiche permesse.
- A 0 il badge sparisce.
- Su un dispositivo senza badge non succede niente e non compare nessun errore.

## Quando si aggiorna
- Nuova segnalazione: la notifica porta il conteggio aggiornato (`badge`) e il service worker imposta il numero, anche ad app chiusa (`lib/sw/service-worker.js`).
- All'apertura dell'app, quando torna in primo piano e su ogni pagina dell'area riservata, il numero si riallinea a quello reale (`components/app-badge-sync.tsx`, `GET /api/admin/badge`).
- Segnalazione aperta, cambiata di stato o eliminata: il numero scende. L'apertura della scheda la segna come letta; i pulsanti di stato e «Elimina» chiedono subito il riallineamento.
- La notifica di prova non tocca il badge.

## Solo per l'amministratore
- `GET /api/admin/badge` risponde con il numero solo all'amministratore (`isAdmin`); a tutti gli altri risponde 401. Non viene mai salvato in cache.
- La pagina chiede il numero solo se il dispositivo è iscritto alle notifiche, e possono iscriversi solo i dispositivi dell'amministratore. I visitatori non mandano nessuna richiesta.

## Verifiche
- `tests/app-badge.cjs`:
  - impostazione, azzeramento, permesso rifiutato e assenza di supporto;
  - conteggio che scende con segnalazione letta, archiviata, eliminata o risolta, uguale al numero del riquadro admin;
  - numero restituito solo all'amministratore.
- `tests/service-worker.cjs`:
  - push con numero, con 0 e senza numero;
  - numero non valido;
  - badge rifiutato o non supportato, con la notifica che viene mostrata comunque.
- `tests/push.cjs`: il conteggio viaggia nella notifica di una nuova segnalazione.
- Non verificabile qui: il badge vero su iPhone.
