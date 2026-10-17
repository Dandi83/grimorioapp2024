# I miei personaggi Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement inline.

**Goal:** Usable character-sheet preview; private cloud persistence only on an isolated database.
**Architecture:** Shared typed character model and calculations, client editor and catalogue links. Verified Vercel database variables share production and preview scope: no migrations. First deliverable is memory-only with explicit demo banner. Cloud accounts remain incomplete.
**Tech Stack:** Next.js, React, TypeScript, existing SRD JSON.
**Spec:** docs/superpowers/specs/2026-10-17-personaggi-design.md

## Global Constraints
Preview only, no production promotion or database writes. Multiple characters; in-app entry; mobile-first dark/gold. No localStorage private archive. No claim of completion before real private persistence verified.

## Review Focus
Numeric bounds; navigation/reload loss warning; odd-score calculations; independent history snapshots; no private data sent to shared database.

### Task 1: Character model
Files: lib/characters.ts, tests/characters.cjs
- [ ] Test proficiency breakpoints, negative modifiers, mastery, numeric bounds and temporary HP damage.
- [ ] Implement typed model, defaults, calculations and normalization.
- [ ] Run model tests.

### Task 2: Editor preview
Files: components/characters/*, app/personaggi/page.tsx, app/account/page.tsx, app/page.tsx
- [ ] Gallery, guided creation, six tabs; memory-only state labelled.
- [ ] SRD options, spells, conditions, slots, inventory, capacities, notes, memory history and JSON export.
- [ ] Account page explains activation dependency, without collecting credentials.
- [ ] TypeScript, existing tests, build and interaction verification.

### Task 3: Deployment
- [ ] Dedicated GitHub preview branch and source preservation.
- [ ] Preview deployment; READY and route checks.
- [ ] Deliver preview URL with exact persistence limitation.
