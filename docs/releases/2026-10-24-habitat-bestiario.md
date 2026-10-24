# Habitat del Bestiario — 24 ottobre 2026

Ramo `data/habitat-mostri-20261024` (commit d65e331, classificazione degli habitat), unito con `main` 764d0b6 (#74). Non unito: attende l'OK di Daniele.

## Dati
- `lib/data/habitat-mostri.json`: habitat di 335 creature, cioè 330 del 2024 e 5 solo 2014 (Duergar, Elfo drow, Gnomo delle profondità, Lucertoloide, Orco).
  - Le 2014 collegate usano la chiave della 2024 (`habitatKey`, `lib/data/monster-edition-links.json`).
  - È una classificazione nostra, non testo SRD.
- Controlli (`tests/habitat-data.cjs`), tutti superati senza correzioni:
  - ogni chiave esiste nel catalogo;
  - nessuna chiave di una 2014 collegata;
  - solo i 13 valori di `lib/habitats.ts`, in ordine, senza doppioni;
  - nessun elenco vuoto;
  - ognuna delle 652 creature del catalogo (330 del 2024, 322 del 2014) ha almeno un habitat.
- Le creature aggiunte dall'admin (Beholder, Githyanki guerriero, Mind Flayer) non sono nel file: i loro habitat si impostano dall'editor.

## Regola degli habitat salvati dall'admin
`lib/monster-habitats.ts`, `resolveHabitats`:
- un elenco con almeno un habitat salvato dall'admin vince sul file, come prima;
- un elenco vuoto salvato dall'admin vale come «non impostato» e mostra l'habitat del file. Prima vinceva anche se vuoto;
- l'editor apre la scheda con l'habitat mostrato al pubblico (quello del file, se l'admin non ne ha scelto uno);
- togliere tutte le spunte riporta all'habitat del file.

## Cache dell'elenco
- `lib/monster-index.ts` mette il file degli habitat nell'impronta della cache dell'elenco (`projectCatalogVersion`): con il nuovo file l'elenco si ricalcola alla pubblicazione, senza aspettare l'ora.
- Nell'impronta entra anche `HABITAT_RULE`, la regola tra file e scelta dell'admin. Sull'anteprima l'elenco in cache era ancora quello calcolato con la regola vecchia, condiviso con l'anteprima precedente: il Lich risultava senza habitat nell'elenco ma con «Qualsiasi» nella scheda.
- Il test controlla tutte e due le cose.
