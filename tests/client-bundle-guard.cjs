const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

(async () => {
  const { sheetFingerprints, findLeaks } = await import('../scripts/check-client-bundle.mjs');
  const prints = sheetFingerprints();
  for (const file of ['srd-monsters-5.1-it.json', 'srd-monsters-5.2.1-it.json', 'srd-animals-5.2.1-it.json'])
    assert.ok(prints.some(print => print.file === file), `${file} has fingerprints`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grimorio-client-'));
  try {
    fs.mkdirSync(path.join(dir, 'chunks'));
    // Light index fields only: what the list really sends.
    fs.writeFileSync(path.join(dir, 'chunks', 'list.js'), `self.list=${JSON.stringify(prints.slice(0, 50).map(({ id }) => ({ id })))}`);
    assert.deepEqual(findLeaks(dir, prints), []);
    // A full sheet imported by a client component, escaped the way a bundler does.
    const leaked = prints.find(print => print.file === 'srd-monsters-5.1-it.json');
    fs.writeFileSync(path.join(dir, 'chunks', 'sheet.js'), `JSON.parse('{"azioni":"<strong>x</strong> ${leaked.fragment}"}')`);
    assert.deepEqual(findLeaks(dir, prints).map(leak => leak.id), [leaked.id]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log('Client bundle guard: light index allowed, full 2014 and 2024 sheets in browser code rejected.');
})().catch(error => { console.error(error); process.exit(1); });
