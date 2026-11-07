#!/usr/bin/env bash
# «Pulizia branch uniti» (PROMPT 42, PROMPT 74). Quattro modalità, solo API REST (gh api) e solo il GITHUB_TOKEN
# automatico (GH_TOKEN). Variabili: MODALITA, GITHUB_REPOSITORY, BRANCH_LIST (solo per le modalità «archivia-…»).
#
# «prova» e «elimina» (PROMPT 42, invariate): elencano i branch del repository e, solo in «elimina», cancellano quelli
# già uniti in main. Mai main, mai un branch protetto, mai un branch con una PR aperta, mai il filone iPhone (cloud/…).
# Un branch è «unito» se:
#   - una PR chiusa con merge ha head.ref uguale al branch e head.sha uguale al suo ultimo commit attuale; oppure
#   - il suo ultimo commit è già contenuto in main (API compare: «behind» o «identical»).
#
# «archivia-prova» e «archivia-ed-elimina» (PROMPT 74): lavorano SOLO sull'elenco esplicito BRANCH_LIST (nomi separati
# da virgola, spazio o a capo; vuoto = errore e nessuna azione). Per ogni nome, rifiutato sempre senza toccare nulla:
# main, branch protetto, cloud/…, branch con una PR aperta, nome che non esiste. Altrimenti tag d'archivio
# «archivio/<nome-branch>» sull'ultimo commit attuale del branch:
#   - «archivia-prova»: mostra solo cosa farebbe, nessuna scrittura;
#   - «archivia-ed-elimina»: crea il tag se manca (se esiste già sullo stesso commit va bene; su un altro commit il
#     branch è rifiutato), rilegge il tag da GitHub e cancella il branch SOLO se il tag esiste davvero e punta
#     all'ultimo commit attuale del branch (ricontrollato subito prima della cancellazione, con PR aperte e
#     protezione). Nessun tag viene mai cancellato o spostato.
set -euo pipefail

MODALITA="${MODALITA:-prova}"
case "$MODALITA" in
  prova|elimina|archivia-prova|archivia-ed-elimina) ;;
  *) echo "Modalità sconosciuta: $MODALITA (prova, elimina, archivia-prova o archivia-ed-elimina)" >&2; exit 2 ;;
esac
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY mancante}"
SUMMARY="${GITHUB_STEP_SUMMARY:-/dev/stdout}"
MAIN="main"
BRANCH_LIST="${BRANCH_LIST:-}"

# Le modalità «archivia-…» senza elenco si fermano qui, prima di qualsiasi chiamata a GitHub.
LIST=""
case "$MODALITA" in archivia-*)
  LIST="$(mktemp)"
  # Virgole, spazi, tabulazioni e a capo separano i nomi; doppioni tolti, ordine conservato.
  printf '%s\n' "$BRANCH_LIST" | tr ',\t\r ' '\n\n\n\n' | awk 'NF && !seen[$0]++' > "$LIST"
  if [ ! -s "$LIST" ]; then
    echo "Errore: la modalità «$MODALITA» richiede l'elenco dei branch nel campo «branch» (nomi separati da virgola, spazio o a capo). Nessuna azione." >&2
    { echo "## Pulizia branch — modalità «$MODALITA»"; echo; echo "**Errore:** elenco dei branch vuoto. Nessuna azione eseguita."; } >> "$SUMMARY"
    exit 2
  fi
  ;;
esac

# Tutte le pagine di un elenco REST (100 alla volta), fino alla prima vuota; jq filtra ogni pagina.
pages() {
  local path="$1" filter="$2" page=1 body
  while :; do
    body="$(gh api "$path&per_page=100&page=$page")" || return 1
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

cell() { printf '%s' "$1" | sed 's/|/\\|/g'; }

# ───────────────────────────── «prova» ed «elimina» (PROMPT 42, invariate) ─────────────────────────────
if [ "$MODALITA" = "prova" ] || [ "$MODALITA" = "elimina" ]; then
  # I branch con il loro ultimo commit e la protezione, poi il verdetto di ognuno.
  BRANCHES="$(mktemp)"; RESULTS="$(mktemp)"
  pages "repos/$REPO/branches?" '.[] | [.name, .commit.sha, .protected] | @tsv' > "$BRANCHES"
  while IFS=$'\t' read -r name sha protected; do
    IFS=$'\t' read -r action reason pr < <(verdict "$name" "$sha" "$protected")
    printf '%s\t%s\t%s\t%s\t%s\n' "$action" "$name" "$sha" "$reason" "$pr" >> "$RESULTS"
  done < "$BRANCHES"

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
  exit 0
fi

# ───────────────────── «archivia-prova» e «archivia-ed-elimina» (PROMPT 74) ─────────────────────
OWNER="${REPO%%/*}"
# Separatore dei campi delle righe di esito (US, 0x1f): a differenza del tab, «read» non unisce i campi vuoti.
US=$'\x1f'

# Ultimo commit e protezione di un branch, letti da GitHub adesso («sha<TAB>true|false»); vuoto se non esiste.
branch_now() {
  gh api "repos/$REPO/branches/$1" --jq '[.commit.sha, .protected] | @tsv' 2>/dev/null || true
}

# Il commit a cui punta un tag, letto da GitHub adesso; vuoto se il tag non esiste. Un tag annotato si risolve
# all'oggetto tag per arrivare al commit.
tag_commit() {
  local obj type sha
  obj="$(gh api "repos/$REPO/git/ref/tags/$1" --jq '[.object.type, .object.sha] | @tsv' 2>/dev/null || true)"
  [ -n "$obj" ] || return 0
  IFS=$'\t' read -r type sha <<< "$obj"
  case "$type" in
    commit) ;;
    tag) sha="$(gh api "repos/$REPO/git/tags/$sha" --jq '.object.sha' 2>/dev/null || true)" ;;
    *) sha="" ;;
  esac
  printf '%s' "$sha"
}

# Le PR aperte con head su quel branch, lette da GitHub adesso («#1,#2», vuoto se nessuna, «errore» se la lettura cade).
open_prs_now() {
  local out
  out="$(pages "repos/$REPO/pulls?state=open&head=$OWNER:$1" '.[] | "#\(.number)"' 2>/dev/null)" || { echo errore; return; }
  printf '%s' "$out" | paste -sd, -
}

# Un branch dell'elenco: scrive «nome␟sha␟tag␟esito␟motivo» (campi separati da US).
#   tag: creato | già presente | da creare | —      esito: eliminato | da eliminare | rifiutato
archive_one() {
  local name="$1" tag="archivio/$1" sha="" protected now open existing reread sha2 prot2 open2 tag_state="—"
  refuse() { printf '%s%s%s%s%s%srifiutato%s%s\n' "$name" "$US" "$sha" "$US" "$tag_state" "$US" "$US" "$1"; }
  if ! printf '%s' "$name" | grep -Eq '^[A-Za-z0-9_][A-Za-z0-9._/@+_-]*$'; then refuse "nome non valido"; return; fi
  if [ "$name" = "$MAIN" ]; then refuse "branch principale"; return; fi
  case "$name" in cloud/*) refuse "filone iPhone (cloud/…)"; return ;; esac
  now="$(branch_now "$name")"
  if [ -z "$now" ]; then refuse "non esiste"; return; fi
  IFS=$'\t' read -r sha protected <<< "$now"
  if [ "$protected" = "true" ]; then refuse "branch protetto"; return; fi
  open="$(awk -F'\t' -v b="$name" '$2 == "open" && $4 == b { print "#" $1 }' "$PRS" | paste -sd, -)"
  if [ -n "$open" ]; then refuse "PR ancora aperta $open"; return; fi
  existing="$(tag_commit "$tag")"
  if [ -n "$existing" ] && [ "$existing" != "$sha" ]; then
    refuse "tag \`$tag\` già presente su un altro commit (${existing:0:7})"; return
  fi
  if [ "$MODALITA" = "archivia-prova" ]; then
    if [ -n "$existing" ]; then tag_state="già presente"; else tag_state="da creare"; fi
    printf '%s%s%s%s%s%sda eliminare%s\n' "$name" "$US" "$sha" "$US" "$tag_state" "$US" "$US"; return
  fi
  # «archivia-ed-elimina»: prima il tag…
  if [ -n "$existing" ]; then
    tag_state="già presente"
  elif gh api -X POST "repos/$REPO/git/refs" -f "ref=refs/tags/$tag" -f "sha=$sha" >/dev/null 2>&1; then
    tag_state="creato"
  else
    refuse "creazione del tag \`$tag\` non riuscita"; return
  fi
  # …poi il tag riletto da GitHub: deve esistere davvero e puntare all'ultimo commit del branch.
  reread="$(tag_commit "$tag")"
  if [ "$reread" != "$sha" ]; then
    refuse "tag \`$tag\` non riletto da GitHub sul commit ${sha:0:7} (branch lasciato)"; return
  fi
  # …poi il branch com'è adesso: stesso commit, non protetto, senza PR aperte; altrimenti resta (con il tag).
  now="$(branch_now "$name")"
  IFS=$'\t' read -r sha2 prot2 <<< "${now:-$'\t'}"
  if [ "$sha2" != "$sha" ]; then refuse "branch cambiato nel frattempo (ora ${sha2:0:7}); tag lasciato"; return; fi
  if [ "$prot2" = "true" ]; then refuse "branch protetto nel frattempo; tag lasciato"; return; fi
  open2="$(open_prs_now "$name")"
  if [ -n "$open2" ]; then refuse "PR aperta nel frattempo ($open2); tag lasciato"; return; fi
  if gh api -X DELETE "repos/$REPO/git/refs/heads/$name" >/dev/null 2>&1; then
    printf '%s%s%s%s%s%seliminato%s\n' "$name" "$US" "$sha" "$US" "$tag_state" "$US" "$US"
  else
    refuse "cancellazione non riuscita; tag lasciato"
  fi
}

RESULTS="$(mktemp)"
while IFS= read -r name; do
  line="$(archive_one "$name")"
  printf '%s\n' "$line" >> "$RESULTS"
  IFS="$US" read -r _ sha tag_state outcome reason <<< "$line"
  echo "$name: ${sha:+${sha:0:7} · }tag $tag_state · $outcome${reason:+ ($reason)}"
done < "$LIST"

total="$(wc -l < "$RESULTS" | tr -d ' ')"
count() { awk -F"$US" -v c="$1" -v v="$2" '$c == v' "$RESULTS" | wc -l | tr -d ' '; }
refused="$(count 4 rifiutato)"
{
  echo "## Pulizia branch — modalità «$MODALITA»"
  echo
  if [ "$MODALITA" = "archivia-prova" ]; then
    echo "Nessuna scrittura: tag e branch sono come prima. **Da eliminare: $(count 4 'da eliminare')** (tag da creare: $(count 3 'da creare'), già presenti: $(count 3 'già presente')) · **Rifiutati: $refused** · in elenco: $total"
  else
    echo "**Eliminati: $(count 4 eliminato)** · **Tag creati: $(count 3 creato)** (già presenti: $(count 3 'già presente')) · **Rifiutati: $refused** · in elenco: $total"
  fi
  echo
  echo "| Branch | Ultimo commit | Tag d'archivio | Esito |"
  echo "| --- | --- | --- | --- |"
  while IFS="$US" read -r name sha tag_state outcome reason; do
    tag_cell="$tag_state"; [ "$tag_state" = "—" ] || tag_cell="$tag_state (\`archivio/$name\`)"
    sha_cell="—"; [ -z "$sha" ] || sha_cell="\`${sha:0:7}\`"
    echo "| \`$(cell "$name")\` | $sha_cell | $(cell "$tag_cell") | $(cell "$outcome")${reason:+: $(cell "$reason")} |"
  done < "$RESULTS"
} >> "$SUMMARY"

echo "Modalità $MODALITA: in elenco $total, da eliminare $(count 4 'da eliminare'), eliminati $(count 4 eliminato), tag creati $(count 3 creato), rifiutati $refused."
