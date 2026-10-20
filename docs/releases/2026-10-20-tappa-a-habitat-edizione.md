# Tappa A — Habitat ed edizione 2014 nel Bestiario — 20 ottobre 2026

Branch `feat/habitat-edizione-bestiario-20261020`. Piano approvato da Daniele il 20 ottobre (tappe A, B, C).

## Cosa cambia

- **Habitat**: lista fissa di 13 voci (`lib/habitats.ts`). Valori iniziali da `lib/data/habitat-mostri.json` (vuoto per ora); scelte dell'admin nella tabella `grimorio_monster_habitats`, creata al primo salvataggio (stesso schema dei campi extra, ma senza vincolo verso `monsters`, così funziona anche per le schede presenti solo nei file del progetto). Nessuna modifica alla tabella `monsters`, nessuna migrazione.
- L'habitat è unico per le due edizioni dello stesso mostro: si salva sotto l'id 2024 (`lib/data/monster-edition-links.json`, abbinamenti 2014 → 2024 con i casi da approvare segnati in `daApprovare`).
- **Admin**: caselle Habitat nei moduli di creazione e modifica; anteprima con la riga Habitat. Per le schede solo-progetto il salvataggio aggiorna solo habitat ed etichetta (prima dava «Scheda non trovata»).
- **Bestiario**: selettore «D&D5e 2024 | D&D5e 2014» sopra Mostri/Animali, ricordato sul telefono (`localStorage`, chiave `grimorio.bestiario.edizione`) e leggibile dall'indirizzo (`?edizione=2014`); filtro Habitat a scelta multipla (`?habitat=Foresta,Collina`): compare chi vive in almeno uno degli habitat scelti; chi ha «Qualsiasi» compare sempre.
- **Scheda mostro**: riga «Habitat» nel riquadro dei dettagli, nascosta se vuota.
- **Schede 2014**: le 10 schede SRD 5.1 hanno ora id con suffisso `-2014`. I vecchi indirizzi (`/mostro/orco`…) rinviano con 308 dalla configurazione (`next.config.mjs`, `lib/data/renamed-monster-ids.json`); i preferiti salvati vengono rinominati al caricamento. Il rinvio è a livello di instradamento perché `permanentRedirect` in una pagina ISR generata al volo duplicava l'intestazione Location al primo accesso (riprodotto con la prova nel browser).
- **/fonti**: numero delle schede 2014 calcolato dai dati e nota sulle modifiche richiesta dalla licenza CC BY 4.0.

## Da fare nelle tappe successive

- Verifica carattere per carattere dell'attribuzione SRD 5.2.1 con la pagina 1 del PDF: `media.dndbeyond.com` ancora non raggiungibile da questo ambiente al 20 ottobre.
- Tappa B: 10 schede 2014 campione dal PDF italiano SRD 5.1, con controllo numerico sul database inglese 5e-bits.

## Verifiche

- Nuovo `tests/monster-habitats.cjs`; aggiornati test di elenco, editor, preferiti, schema, payload, 2014.
- `npm test`, `npm run lint` (0 errori), `npx tsc --noEmit`, `npm run test:e2e` (11 prove, compresa la nuova su 2014 e vecchi link) superati su compilazione pulita.
