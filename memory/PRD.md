# GrimorioApp — Product Requirements Document

## Overview
GrimorioApp is a mobile port of a PyQt6 desktop app the user built to browse Dungeons & Dragons 5th Edition (2024 revision) spells in Italian. The mobile app preserves the original functionality (search + view spells) and adds mobile-native features: filters, favorites, and a modernized dark grimoire UI.

## Source Material
- **main.py**: PyQt6 desktop app with a search input, suggestion list, and HTML detail view (parchment aesthetic).
- **incantesimi_2024.json**: 84 spells with fields `nome_italiano`, `livello`, `tempo_di_lancio`, `gittata`, `componenti`, `durata`, `descrizione`.

## Backend (FastAPI + MongoDB)
- Automatic seed on startup: parses `livello` string to extract `livello_num` (0 for `Trucchetto`, 1–9 otherwise), `scuola` (Abiurazione, Ammaliamento, Divinazione, Evocazione, Illusione, Invocazione, Necromanzia, Trasmutazione), and `classi[]`.
- Endpoints (all under `/api`):
  - `GET /spells` — list, filters: `q` (name contains, case-insensitive), `livello`, `scuola`, `classe`
  - `GET /spells/meta` — distinct values for schools, classes, levels
  - `GET /spells/{id}` — single spell by uuid

## Frontend (Expo Router + React Native)
- **Tab navigation** (Home, Grimorio, Preferiti)
- **Home** — cinematic hero with dark fantasy image, gradient scrim, gold CTA to search, horizontal school shortcuts, level grid (0–9)
- **Grimorio (Spells list)** — sticky header with real-time search + expandable filter chips (Livello, Scuola, Classe). List rows with school-tinted accent bar, star toggle for favorites.
- **Spell Detail** — full-bleed hero image + gradient scrim, large serif title, school badge, 2×2 tactical metadata grid (Tempo di lancio, Gittata, Componenti, Durata), class pills, description body. Sticky gold FAB toggles favorite.
- **Preferiti** — locally saved spells (AsyncStorage), simple list.

## Design System
- Dark Glass/Luxe: `#0A0A0B` surface, gold `#D4AF37` brand accents, Georgia serif for display, System sans for body.
- Per-school subtle color coding on accents and badges.

## Data Persistence
- MongoDB: `spells` collection (seeded once).
- Client: AsyncStorage under key `grimorio.favorites.v1` for favorites (string[] of spell ids).

## Language
- Italian throughout (labels, empty states, headers).
