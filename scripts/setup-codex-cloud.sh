#!/usr/bin/env bash
# Setup della root ufficiale. Non legge credenziali e non modifica database.
set -euo pipefail

grimorio_setup_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$grimorio_setup_root"

node -e 'const major=Number(process.versions.node.split(".")[0]); if(major<22){console.error("Il setup cloud richiede Node.js 22 o successivo; consigliato Node.js 24 LTS."); process.exit(1)}'
npm ci
npm test
npm run build
