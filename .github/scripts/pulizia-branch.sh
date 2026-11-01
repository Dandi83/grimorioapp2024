#!/usr/bin/env bash
# «Pulizia branch uniti» (PROMPT 42): elenca i branch del repository e, solo in modalità «elimina», cancella quelli
# già uniti in main. Mai main, mai un branch protetto, mai un branch con una PR aperta, mai il filone iPhone (cloud/…).
# Un branch è «unito» se:
#   - una PR chiusa con merge ha head.ref uguale al branch e head.sha uguale al suo ultimo commit attuale; oppure
#   - il suo ultimo commit è già contenuto in main (API compare: «behind» o «identical»).
# Solo API REST (gh api), solo il GITHUB_TOKEN automatico (GH_TOKEN). Uso: MODALITA=prova|elimina, GITHUB_REPOSITORY.
set -euo pipefail

MODALITA="${MODALITA:-prova}"
case "$MODALITA" in prova|elimina) ;; *) echo "Modalità sconosciuta: $MODALITA (prova o elimina)" >&2; exit 2 ;; esac
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY mancante}"
SUMMARY="${GITHUB_STEP_SUMMARY:-/dev/stdout}"
MAIN="main"

# Tutte le pagine di un elenco REST (100 alla volta), fino alla prima vuota; jq filtra ogni pagina.
pages() {
  local path="$1" filter="$2" page=1 body
  while :; do
    body="$(gh api "$path&per_page=100&page=$page")"
    [ "$(printf '%s' "$body" | jq 'length')" -gt 0 ] || break
    printf '%s' "$body" | jq -r "$filter"
    page=$((page + 1))
  done
}

# Tutte le PR del repository (aperte e chiuse) con head nello stesso repository: numero, stato, merge, ref, sha.
PRS="$(mktemp)"
pages "repos/$REPO/pulls?state=all" \
  ".[] | select(.head.repo.full_name == \"$REPO\") | [.number, .state, (.merged_at // \"\"), .head.ref, .head.sha] | @tsv" > "$PRS"

# Il controllo di un branch: «elimina<TAB>motivo<TAB>PR» oppure «tieni<TAB>motivo<TAB>PR».
verdict() {
  local name="$1" sha="$2" protected="$3" open merged status
  if [ "$name" = "$MAIN" ]; then printf 'tieni\tbranch principale\t\n'; return; fi
  if [ "$protected" = "true" ]; then printf 'tieni\tbranch protetto\t\n'; return; fi
  # Il filone iPhone (AGENTS.md, «Coordinamento permanente web / iPhone»): i suoi branch restano sempre.
  case "$name" in cloud/*) printf 'tieni\tfilone iPhone (cloud/…)\t\n'; return ;; esac
  open="$(awk -F'\t' -v b="$name" '$2 == "open" && $4 == b { print "#" $1 }' "$PRS" | paste -sd, -)"
  if [ -n "$open" ]; then printf 'tieni\tPR ancora aperta\t%s\n' "$open"; return; fi
  merged="$(awk -F'\t' -v b="$name" -v s="$sha" '$3 != "" && $4 == b && $5 == s { print "#" $1 }' "$PRS" | paste -sd, -)"
  if [ -n "$merged" ]; then printf 'elimina\tPR unita, stesso ultimo commit\t%s\n' "$merged"; return; fi
  status="$(gh api "repos/$REPO/compare/$MAIN...$sha" --jq '.status' 2>/dev/null || echo errore)"
  case "$status" in
    behind|identical) printf 'elimina\tultimo commit già contenuto in main (%s)\t\n' "$status" ;;
    errore) printf 'tieni\tconfronto con main non riuscito\t\n' ;;
    *) printf 'tieni\tnon unito in main (%s)\t\n' "$status" ;;
  esac
}

# I branch con il loro ultimo commit e la protezione, poi il verdetto di ognuno.
BRANCHES="$(mktemp)"; RESULTS="$(mktemp)"
pages "repos/$REPO/branches?" '.[] | [.name, .commit.sha, .protected] | @tsv' > "$BRANCHES"
while IFS=$'\t' read -r name sha protected; do
  IFS=$'\t' read -r action reason pr < <(verdict "$name" "$sha" "$protected")
  printf '%s\t%s\t%s\t%s\t%s\n' "$action" "$name" "$sha" "$reason" "$pr" >> "$RESULTS"
done < "$BRANCHES"

cell() { printf '%s' "$1" | sed 's/|/\\|/g'; }
to_delete="$(awk -F'\t' '$1 == "elimina"' "$RESULTS" | wc -l | tr -d ' ')"
kept="$(awk -F'\t' '$1 == "tieni"' "$RESULTS" | wc -l | tr -d ' ')"
deleted=0; failed=0

if [ "$MODALITA" = "elimina" ]; then
  while IFS=$'\t' read -r action name sha reason pr; do
    [ "$action" = "elimina" ] || continue
    # Di nuovo gli stessi controlli, sul branch come è adesso: se nel frattempo è cambiato, resta.
    current="$(gh api "repos/$REPO/branches/$name" --jq '[.name, .commit.sha, .protected] | @tsv' 2>/dev/null || true)"
    [ -n "$current" ] || continue
    IFS=$'\t' read -r cname csha cprot <<< "$current"
    IFS=$'\t' read -r again _ _ < <(verdict "$cname" "$csha" "$cprot")
    if [ "$again" = "elimina" ] && [ "$csha" = "$sha" ] && gh api -X DELETE "repos/$REPO/git/refs/heads/$name" >/dev/null 2>&1; then
      deleted=$((deleted + 1)); echo "Eliminato: $name"
    else
      failed=$((failed + 1)); echo "Non eliminato (cambiato o errore): $name"
    fi
  done < "$RESULTS"
fi

{
  echo "## Pulizia branch uniti — modalità «$MODALITA»"
  echo
  if [ "$MODALITA" = "prova" ]; then
    echo "Nessun branch eliminato. **Da eliminare: $to_delete** · **Tenuti: $kept**"
    echo
    echo "### Da eliminare ($to_delete)"
    echo
    echo "| Branch | Motivo | PR |"
    echo "| --- | --- | --- |"
    awk -F'\t' '$1 == "elimina"' "$RESULTS" | while IFS=$'\t' read -r _ name _ reason pr; do
      echo "| \`$(cell "$name")\` | $(cell "$reason") | $(cell "$pr") |"
    done
  else
    echo "**Eliminati: $deleted** su $to_delete uniti · non eliminati perché cambiati o per errore: $failed · **Tenuti: $kept**"
  fi
  echo
  echo "### Tenuti ($kept)"
  echo
  echo "| Branch | Motivo |"
  echo "| --- | --- |"
  awk -F'\t' '$1 == "tieni"' "$RESULTS" | while IFS=$'\t' read -r _ name _ reason pr; do
    echo "| \`$(cell "$name")\` | $(cell "$reason")${pr:+ $pr} |"
  done
} >> "$SUMMARY"

echo "Modalità $MODALITA: da eliminare $to_delete, tenuti $kept, eliminati $deleted."
