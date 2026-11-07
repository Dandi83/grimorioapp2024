#!/usr/bin/env bash
# Browsers for the e2e tests in GitHub CI (PROMPT 73).
#
# The slow part was never the browsers (a few seconds from the Playwright CDN) but the ~185 system packages
# (~139 MB) that `playwright install --with-deps` downloads from the Ubuntu mirror: at 240 kB/s that took
# more than the 10-minute step limit (PROMPT 62, 66, 72). The workflow keeps those .deb files in the
# GitHub cache (actions/cache):
#   - with the cache: only the packages that are not installed yet are installed from the local files,
#     without apt-get update and without the mirror (--no-download); then Playwright itself checks that
#     nothing is missing (`install-deps --dry-run`);
#   - without the cache, or if the local files are not enough: apt-get update, Playwright lists the missing
#     packages (same list as `install --with-deps`), apt downloads only those into the cache folder
#     (retries, time limit per attempt, a second attempt that resumes what was already downloaded),
#     then they are installed from there like above.
#   - last resort: the old command (`playwright install-deps`).
# Same browsers as before: chromium, webkit, firefox. With the browser cache `playwright install` does nothing.
#
# Output for the workflow (GITHUB_OUTPUT): pacchetti-da-salvare=true when new .deb files came from the mirror.

set -euo pipefail

BROWSERS=(chromium webkit firefox)
DEB_DIR="${PW_DEB_DIR:-$HOME/.cache/pw-apt-debs}"
ATTEMPT_SECONDS="${PW_APT_ATTEMPT_SECONDS:-420}"
OUTPUT_FILE="${GITHUB_OUTPUT:-/dev/null}"
CHECK_FILE="$(mktemp)"
APT_OPTS=(-o Acquire::Retries=3 -o Acquire::http::Timeout=30 -o Acquire::https::Timeout=30
  -o Dpkg::Use-Pty=0 -o APT::Sandbox::User=root)

SUDO=()
if [ "$(id -u)" -ne 0 ]; then
  SUDO=(sudo env "PATH=$PATH")
fi

log() { printf '[browser] %s\n' "$*"; }

# Playwright's own check: exit 0 and "All system dependencies are installed." only when nothing is missing;
# otherwise it lists the packages apt would install (dependencies included).
deps_check() {
  npx playwright install-deps --dry-run "${BROWSERS[@]}" >"$CHECK_FILE" 2>&1
}

missing_packages() {
  sed -n 's/^  \([a-z0-9][a-z0-9.+:-]*\)$/\1/p' "$CHECK_FILE"
}

install_local_debs() {
  mkdir -p "$DEB_DIR"
  shopt -s nullglob
  local debs=("$DEB_DIR"/*.deb)
  shopt -u nullglob
  local todo=() deb pkg
  for deb in "${debs[@]}"; do
    pkg="$(dpkg-deb -f "$deb" Package)"
    if ! dpkg-query -W -f='${Status}' "$pkg" 2>/dev/null | grep -q 'install ok installed'; then
      todo+=("$deb")
    fi
  done
  log "Pacchetti nella cartella della cache: ${#debs[@]}; non ancora installati: ${#todo[@]}."
  if [ "${#todo[@]}" -gt 0 ]; then
    # apt sees only the installed packages and these files (no sources, no mirror, no apt-get update):
    # if something is missing it stops before changing anything.
    local no_sources
    no_sources="$(mktemp -d)"
    touch "$no_sources/empty.list"
    "${SUDO[@]}" apt-get install -y --no-install-recommends --no-download "${APT_OPTS[@]}" \
      -o "Dir::Etc::sourcelist=$no_sources/empty.list" -o "Dir::Etc::sourceparts=$no_sources" \
      -o "Dir::Cache::archives=$DEB_DIR" "${todo[@]}" || return 1
    "${SUDO[@]}" rm -rf "$DEB_DIR/partial" "$DEB_DIR/lock"
  fi
  if ! deps_check; then
    log "Playwright segnala ancora dipendenze mancanti: $(missing_packages | wc -l)."
    return 1
  fi
  log "Dipendenze di sistema complete."
}

# One file per package (the newest): the local install must not see two versions of the same package.
dedupe_debs() {
  declare -A best=()
  local deb pkg
  shopt -s nullglob
  for deb in "$DEB_DIR"/*.deb; do
    pkg="$(dpkg-deb -f "$deb" Package)"
    if [ -z "${best[$pkg]:-}" ]; then
      best[$pkg]="$deb"
    elif dpkg --compare-versions "$(dpkg-deb -f "$deb" Version)" gt "$(dpkg-deb -f "${best[$pkg]}" Version)"; then
      rm -f "${best[$pkg]}"
      best[$pkg]="$deb"
    else
      rm -f "$deb"
    fi
  done
  shopt -u nullglob
}

download_missing_debs() {
  local attempt
  for attempt in 1 2; do
    log "apt-get update, tentativo $attempt di 2."
    if "${SUDO[@]}" timeout --kill-after=20 180 apt-get update "${APT_OPTS[@]}"; then
      break
    fi
    [ "$attempt" -eq 2 ] && return 1
  done
  if deps_check; then
    log "Nessun pacchetto mancante."
    return 0
  fi
  local missing
  mapfile -t missing < <(missing_packages)
  if [ "${#missing[@]}" -eq 0 ]; then
    log "Elenco dei pacchetti mancanti non leggibile:"
    cat "$CHECK_FILE"
    return 1
  fi
  log "Pacchetti mancanti da scaricare: ${#missing[@]}."
  mkdir -p "$DEB_DIR/partial"
  for attempt in 1 2; do
    log "Download dal mirror, tentativo $attempt di 2 (al massimo ${ATTEMPT_SECONDS} s)."
    # timeout (without --foreground) stops the whole process group. Files already complete stay in DEB_DIR
    # and the second attempt downloads only the others.
    if "${SUDO[@]}" timeout --kill-after=20 "$ATTEMPT_SECONDS" apt-get install -y --no-install-recommends \
      --download-only "${APT_OPTS[@]}" -o "Dir::Cache::archives=$DEB_DIR" "${missing[@]}"; then
      "${SUDO[@]}" rm -rf "$DEB_DIR/partial" "$DEB_DIR/lock"
      "${SUDO[@]}" chown -R "$(id -u):$(id -g)" "$DEB_DIR"
      dedupe_debs
      echo "pacchetti-da-salvare=true" >>"$OUTPUT_FILE"
      return 0
    fi
    log "Tentativo $attempt non riuscito."
  done
  return 1
}

if install_local_debs; then
  log "Nessun download dal mirror Ubuntu."
elif download_missing_debs && install_local_debs; then
  log "Pacchetti scaricati dal mirror e installati."
else
  log "Ultima possibilità: playwright install-deps come prima."
  "${SUDO[@]}" timeout --kill-after=20 "$ATTEMPT_SECONDS" npx playwright install-deps "${BROWSERS[@]}"
fi

for attempt in 1 2; do
  if npx playwright install "${BROWSERS[@]}"; then
    break
  fi
  if [ "$attempt" -eq 2 ]; then
    exit 1
  fi
  log "Download dei browser non riuscito, nuovo tentativo."
done
rm -f "$CHECK_FILE"
