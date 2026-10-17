# Completamento catalogo SRD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere i 20 incantesimi SRD mancanti mantenendo intatte tutte le schede esistenti.

**Architecture:** Estendere la trascrizione riproducibile del PDF a 340 record (339 incantesimi distinti più il duplicato storico). Inserire i 20 nuovi record nel database attraverso una migrazione transazionale idempotente, senza aggiornamenti o cancellazioni delle righe esistenti. Preparare e verificare il codice in preview; eseguire l'inserimento in produzione soltanto con autorizzazione.

**Tech Stack:** Next.js, TypeScript, PostgreSQL/Drizzle, script Node e Python esistenti.

**Spec:** Richiesta in chat del 17 ottobre 2026: «aggiungi i rimanenti 20»; PDF ufficiale IT_SRD_CC_v5.2.1.pdf, SHA256 a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718.

## Global Constraints

- Testi italiani integrali dal PDF ufficiale, senza riformulare regole.
- Conservare le 369 schede esistenti, ID, descrizioni personalizzate e preferiti.
- Conservare attribuzione CC BY 4.0, fonti e sottotitolo giallo per gli slot superiori.
- Nessuna credenziale nei file o nei log; nessuna pubblicazione non autorizzata.

## Review Focus

- Collisioni di ID: interrompere prima di sovrascrivere una scheda.
- Riesecuzione migrazione: nessuna duplicazione o perdita di modifiche successive.
- Testi su più colonne o pagine: verifica completa contro il PDF.
- Metadati: livelli, scuole e classi ricercabili dopo l'inserimento.
- Schede amministrabili: nuove righe reali, non schede virtuali impossibili da eliminare.

## Task 1: Trascrizioni e verifiche

**Files:** scripts/transcribe-srd.py; lib/data/srd-italiano-5.2.1.json; scripts/check-srd-content.mjs; scripts/check-srd-rendering.mjs; docs/srd-incantesimi-integrali.md.

**Interfaces:** Le nuove trascrizioni mantengono lo schema corrente id/appName/sourceName/livello/tempo_di_lancio/gittata/componenti/durata/descrizione/pages/sourceAlphanumericSha256.

- [ ] Aggiungere test che falliscano se manca uno dei 20 nuovi incantesimi o i suoi metadati.
- [ ] Osservare il fallimento di npm test prima della modifica al dataset.
- [ ] Integrare i titoli mancanti con ID derivati dal nome; rigenerare esclusivamente dal PDF verificato.
- [ ] Eseguire la verifica PDF, npm test e npm run build; verificare che i 320 record precedenti siano invariati.

## Task 2: Inserimento sicuro e rilascio

**Files:** nuova migrazione scripts/migrations/add-20-srd.mjs; test di migrazione; docs/releases/2026-10-17-completamento-srd.md; eventuale collegamento di build strettamente limitato all'inserimento autorizzato.

**Interfaces:** Migrazione connessa tramite DATABASE_URL già configurata, transazione unica, INSERT dei soli 20 nuovi ID; riesecuzione non aggiorna righe preesistenti. Nessun cambiamento agli accessori getAllSpells/getSpellById.

- [ ] Scrivere e osservare test fallenti per prima esecuzione, riesecuzione e rollback in caso di collisione inattesa.
- [ ] Implementare l'inserimento e verificare che modifiche o eliminazioni amministrative restino possibili.
- [ ] Creare preview senza mutare il database di produzione; verificare build e test.
- [ ] Dopo approvazione eseguire l'inserimento, verificare 389 schede complessive e 339 incantesimi distinti SRD.
- [ ] Controllare le 20 route, filtri, fonti e sottotitoli; registrare commit e risultato del rilascio.

## Elenco dei 20

Bacche benefiche; Bagliore lunare; Bagliore solare; Dardo di fuoco; Fiotto acido; Forme animali; Guscio anti-vita; Invisibilità superiore; Levitazione; Muro di fuoco; Palla di fuoco; Palla di fuoco ritardata; Ragnatela; Salto; Scritto illusorio; Scudo di fuoco; Spruzzo colorato; Tempesta di fuoco; Tocco del vampiro; Tocco gelido.
