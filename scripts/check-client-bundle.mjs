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
  { file: 'srd-tools-5.1-it.json', texts: data => [{ id: 'intro', text: data.intro.testo }, ...Object.entries(data.descrizioni).map(([id, rule]) => ({ id, text: rule.testo }))] },
  { file: 'srd-manual-5.2.1-it.json', texts: data => data.entries.find(e => e.id === 'equipaggiamento-strumenti').blocks.filter(b => b.kind === 'prose').map((b, i) => ({ id: `strumenti-${i}`, text: b.text })) },
  // Classes: the feature texts of class and subclass (the sheets render them on the server).
  ...['srd-classes-5.2.1-it.json', 'srd-classes-5.1-it.json'].map(file => ({ file, texts: data => data.classi.flatMap(card => [...card.privilegi, ...card.sottoclasse.privilegi].flatMap((feature, i) =>
    feature.contenuto.filter(block => block.tipo === 'p').map((block, j) => ({ id: `${card.id}-${i}-${j}`, text: block.testo })))) })),
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

function allFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? allFiles(join(dir, entry.name)) : [join(dir, entry.name)]);
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

/** The search index sent to the browser: names, labels and addresses only (lib/search-index.ts). */
export const SEARCH_INDEX_FILE = '.next/server/app/ricerca-indice.json.body';

export function findIndexLeaks(file = SEARCH_INDEX_FILE, prints = sheetFingerprints()) {
  const text = readFileSync(file, 'utf8');
  const leaks = prints.filter(print => text.includes(print.fragment)).map(print => ({ path: file, ...print }));
  const index = JSON.parse(text);
  // A row is [section, name, label, address, address 2014?]: short strings, never a text.
  for (const row of index.rows) {
    if (row.length > 5 || row.slice(1).some(cell => typeof cell !== 'string' || cell.length > 120)) leaks.push({ path: file, id: String(row[1]), file: 'search index', fragment: 'row too long' });
  }
  return leaks;
}

/** Server-only names and, when set during the build, their values: never in the browser code. */
export const SECRET_ENV = ['RESEND_API_KEY', 'FEEDBACK_TO_EMAIL', 'FEEDBACK_FROM_EMAIL', 'TURNSTILE_SECRET_KEY', 'ADMIN_PASSCODE', 'ANALYTICS_SECRET', 'FEEDBACK_SECRET', 'DATABASE_URL', 'VAPID_PRIVATE_KEY'];
/** Server code that must never reach the browser: the email service and the push library that signs with the private key. */
const SERVER_ONLY_MARKERS = ['api.resend.com', 'generateVAPIDKeys'];

export function findSecretLeaks(clientDir, env = process.env) {
  const needles = [
    ...SERVER_ONLY_MARKERS,
    ...SECRET_ENV,
    // Short values (a test passcode) would match by chance: only real-length values are checked.
    ...SECRET_ENV.map(name => env[name]).filter(value => value && value.length >= 8),
  ];
  const leaks = [];
  for (const path of jsFiles(clientDir)) {
    const code = readFileSync(path, 'utf8');
    needles.forEach((needle, i) => { if (code.includes(needle)) leaks.push({ path, what: i < SERVER_ONLY_MARKERS.length + SECRET_ENV.length ? needle : `value of a server variable (${needle.length} characters)` }); });
  }
  return leaks;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const clientDir = process.argv[2] || '.next/static';
  if (!existsSync(clientDir)) throw new Error(`${clientDir} not found: run next build first`);
  const prints = sheetFingerprints();
  // The prerendered index sits in .next/server, where the build output puts it (the layout differs on Vercel).
  const indexFiles = existsSync('.next/server') ? allFiles('.next/server').filter(file => /ricerca-indice\.json(\.body)?$/.test(file) && !file.endsWith('.js')) : [];
  if (!indexFiles.length) console.warn('Search index not found among the build files: checked by the browser tests and in CI.');
  const leaks = [...findLeaks(clientDir, prints), ...indexFiles.flatMap(file => findIndexLeaks(file, prints))];
  if (leaks.length) {
    for (const leak of leaks.slice(0, 10)) console.error(`Full sheet ${leak.id} (${leak.file}) found in ${leak.path}`);
    console.error(`${leaks.length} full sheets in the browser code: lists must use the light index.`);
    process.exit(1);
  }
  const secrets = findSecretLeaks(clientDir);
  if (secrets.length) {
    for (const leak of secrets.slice(0, 10)) console.error(`Server secret ${leak.what} found in ${leak.path}`);
    console.error('Keys, recipients and passcodes must stay on the server.');
    process.exit(1);
  }
  console.log(`No server keys or recipients in the browser code (${SECRET_ENV.length} variables checked).`);
  console.log(`Client bundle and search index (${indexFiles.length} file): no full creature sheets or 2014 spell texts (${prints.length} sheets checked).`);
}
