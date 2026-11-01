# Pulizia dei branch uniti (PROMPT 42)

Azione GitHub lanciata solo a mano: elimina i branch già uniti in main. Non tocca mai `main`, i branch protetti,
quelli con una PR ancora aperta, il filone iPhone (`cloud/…`) e i branch non uniti.

## Come lanciarla
1. Su GitHub apri il repository → **Actions** → **Pulizia branch uniti** (colonna a sinistra).
2. **Run workflow** → nel campo «modalita» scegli:
   - **prova** (predefinita): non elimina nulla; nel riepilogo dell'esecuzione trovi le tabelle «Da eliminare»
     (branch, motivo, PR) e «Tenuti» (branch, motivo);
   - **elimina**: rifà gli stessi controlli, ricontrolla ogni branch subito prima e cancella solo quelli uniti; nel
     riepilogo il numero degli eliminati e la lista dei tenuti.
3. Conviene lanciare prima «prova», leggere le tabelle, poi «elimina».

## Quando un branch è «unito»
- una PR chiusa con merge ha quel branch come origine e lo stesso ultimo commit che il branch ha adesso; oppure
- l'ultimo commit del branch è già contenuto in main (confronto GitHub «behind» o «identical»).

## Come è fatta
- `.github/workflows/pulizia-branch.yml`: avvio solo manuale, permessi `contents: write` e `pull-requests: read`,
  solo il token automatico di GitHub (nessun segreto), `actions/checkout` fissato allo SHA completo.
- `.github/scripts/pulizia-branch.sh`: solo API REST (`gh api`), nessuna GraphQL.
