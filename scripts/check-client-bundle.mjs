// Fails the build when full creature sheets reach the code sent to the browser.
// Lists use the light index (id, name, type, size, CR); full sheets are read on the server only.
// Usage: node scripts/check-client-bundle.mjs [client dir, default .next/static]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SHEET_FILES = ['srd-monsters-5.1-it.json', 'srd-monsters-5.2.1-it.json', 'srd-animals-5.2.1-it.json'];
const FIELDS = ['azioni', 'tratti', 'reazioni', 'azioni_leggendarie'];

/** One plain-ASCII sentence fragment per sheet: it survives minification and string escaping. */
export function sheetFingerprints(dataDir = new URL('../lib/data/', import.meta.url)) {
  const prints = [];
  for (const file of SHEET_FILES) {
    for (const { monster } of JSON.parse(readFileSync(new URL(file, dataDir), 'utf8')).records) {
      const text = FIELDS.map(field => monster[field] || '').join(' ').replace(/<[^>]*>/g, ' ');
      const fragment = text.match(/[A-Za-z][A-Za-z ,]{38,}[A-Za-z]/)?.[0];
      if (fragment) prints.push({ file, id: monster.id, fragment });
    }
  }
  return prints;
}

function jsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? jsFiles(join(dir, entry.name)) : entry.name.endsWith('.js') ? [join(dir, entry.name)] : []);
}

export function findLeaks(clientDir, prints = sheetFingerprints()) {
  const leaks = [];
  for (const path of jsFiles(clientDir)) {
    const code = readFileSync(path, 'utf8');
    for (const print of prints) if (code.includes(print.fragment)) leaks.push({ path, ...print });
  }
  return leaks;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const clientDir = process.argv[2] || '.next/static';
  if (!existsSync(clientDir)) throw new Error(`${clientDir} not found: run next build first`);
  const prints = sheetFingerprints();
  const leaks = findLeaks(clientDir, prints);
  if (leaks.length) {
    for (const leak of leaks.slice(0, 10)) console.error(`Full sheet ${leak.id} (${leak.file}) found in ${leak.path}`);
    console.error(`${leaks.length} full creature sheets in the browser code: lists must use the light index.`);
    process.exit(1);
  }
  console.log(`Client bundle: no full creature sheets (${prints.length} sheets checked).`);
}
