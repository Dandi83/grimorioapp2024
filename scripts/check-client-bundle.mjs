// Fails the build when full creature sheets, 2014 spell texts or equipment rule texts reach the code sent to the browser.
// Lists use the light index (id, name, type, size, CR); full sheets are read on the server only.
// Usage: node scripts/check-client-bundle.mjs [client dir, default .next/static]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const MONSTER_FIELDS = ['azioni', 'tratti', 'reazioni', 'azioni_leggendarie'];
const SHEET_FILES = [
  ...['srd-monsters-5.1-it.json', 'srd-monsters-5.2.1-it.json', 'srd-animals-5.2.1-it.json'].map(file => ({ file, key: 'monster', fields: MONSTER_FIELDS })),
  { file: 'srd-spells-5.1-it.json', key: 'spell', fields: ['descrizione'] },
];
/** Rule texts of the Equipaggiamento section: lists send names and numbers only. */
const RULE_FILES = [
  { file: 'srd-weapons-it.json', texts: data => Object.entries({ ...data.regole2014.proprieta, ...data.regole2014.armiSpeciali }).map(([id, rule]) => ({ id, text: rule.testo })) },
  { file: 'srd-armor-it.json', texts: data => Object.values(data.regole2014).flatMap(group => Object.entries(group)).map(([id, rule]) => ({ id, text: rule.testo })) },
  { file: 'srd-manual-5.2.1-it.json', texts: data => data.entries.find(e => e.id === 'equipaggiamento-equipaggiamento-d-avventura').blocks.filter(b => b.kind === 'prose').map((b, i) => ({ id: `avventura-${i}`, text: b.text })) },
  ...['srd-magic-items-5.2.1-it.json', 'srd-magic-items-5.1-it.json'].map(file => ({ file, texts: data => data.oggetti.flatMap(item =>
    item.blocchi.filter(block => block.kind === 'p').map((block, i) => ({ id: `${item.id}-${i}`, text: block.text.replace(/\*/g, '') }))) })),
  { file: 'srd-adventuring-gear-5.1-it.json', texts: data => [...Object.entries(data.descrizioni).map(([id, rule]) => ({ id, text: rule.testo })), ...data.dotazioni.voci.map(pack => ({ id: pack.nome, text: pack.testo }))] },
];

/** One plain-ASCII sentence fragment per sheet: it survives minification and string escaping. */
export function sheetFingerprints(dataDir = new URL('../lib/data/', import.meta.url)) {
  const prints = [];
  for (const { file, key, fields } of SHEET_FILES) {
    for (const record of JSON.parse(readFileSync(new URL(file, dataDir), 'utf8')).records) {
      const sheet = record[key];
      const text = fields.map(field => sheet[field] || '').join(' ').replace(/<[^>]*>/g, ' ');
      const fragment = text.match(/[A-Za-z][A-Za-z ,]{38,}[A-Za-z]/)?.[0];
      if (fragment) prints.push({ file, id: sheet.id, fragment });
    }
  }
  for (const { file, texts } of RULE_FILES) {
    for (const { id, text } of texts(JSON.parse(readFileSync(new URL(file, dataDir), 'utf8')))) {
      const fragment = text.match(/[A-Za-z][A-Za-z ,]{38,}[A-Za-z]/)?.[0];
      if (fragment) prints.push({ file, id, fragment });
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
    console.error(`${leaks.length} full sheets in the browser code: lists must use the light index.`);
    process.exit(1);
  }
  console.log(`Client bundle: no full creature sheets or 2014 spell texts (${prints.length} sheets checked).`);
}
