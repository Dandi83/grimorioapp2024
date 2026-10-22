const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

(async () => {
  const { sheetFingerprints, findLeaks } = await import('../scripts/check-client-bundle.mjs');
  const prints = sheetFingerprints();
  for (const file of ['srd-monsters-5.1-it.json', 'srd-monsters-5.2.1-it.json', 'srd-animals-5.2.1-it.json', 'srd-spells-5.1-it.json'])
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
    // A 2014 spell text in the browser code is rejected the same way.
    const spell = prints.find(print => print.file === 'srd-spells-5.1-it.json');
    fs.writeFileSync(path.join(dir, 'chunks', 'sheet.js'), `JSON.parse('{"descrizione":"${spell.fragment}"}')`);
    assert.deepEqual(findLeaks(dir, prints).map(leak => leak.id), [spell.id]);
    // The search index: names, labels and addresses pass; a full text or a long cell is rejected.
    const { findIndexLeaks } = await import('../scripts/check-client-bundle.mjs');
    const indexFile = path.join(dir, 'ricerca-indice.json.body');
    fs.writeFileSync(indexFile, JSON.stringify({ v: 1, sections: [{ k: 'mostri', t: 'Mostri', e: 'x' }], rows: [[0, 'Lich', 'Non morto · GS 21', '/mostro/lich']] }));
    assert.deepEqual(findIndexLeaks(indexFile, prints), []);
    fs.writeFileSync(indexFile, JSON.stringify({ v: 1, sections: [], rows: [[0, 'Lich', leaked.fragment, '/mostro/lich'], [0, 'x', 'y'.repeat(200), '/z']] }));
    assert.deepEqual(findIndexLeaks(indexFile, prints).map(leak => leak.id), [leaked.id, 'x']);
    // Server secrets: names, the Resend address and real values are rejected in the browser code.
    const { findSecretLeaks } = await import('../scripts/check-client-bundle.mjs');
    fs.writeFileSync(path.join(dir, 'chunks', 'sheet.js'), 'fetch("/api/segnalazioni")');
    assert.deepEqual(findSecretLeaks(dir, { FEEDBACK_TO_EMAIL: 'destinatario@esempio.it' }), []);
    fs.writeFileSync(path.join(dir, 'chunks', 'sheet.js'), 'x="destinatario@esempio.it";fetch("https://api.resend.com/emails")');
    assert.deepEqual(findSecretLeaks(dir, { FEEDBACK_TO_EMAIL: 'destinatario@esempio.it' }).map(leak => leak.what), ['api.resend.com', 'value of a server variable (23 characters)']);
    // Push notifications: the public key may reach the page, the private key and the signing library never.
    const vapid = { VAPID_PUBLIC_KEY: 'BPubblicaDiProva0123456789', VAPID_PRIVATE_KEY: 'chiave-privata-di-prova-0123456789' };
    fs.writeFileSync(path.join(dir, 'chunks', 'sheet.js'), `k="${vapid.VAPID_PUBLIC_KEY}";`);
    assert.deepEqual(findSecretLeaks(dir, vapid), []);
    fs.writeFileSync(path.join(dir, 'chunks', 'sheet.js'), `k="${vapid.VAPID_PRIVATE_KEY}";w.generateVAPIDKeys()`);
    assert.deepEqual(findSecretLeaks(dir, vapid).map(leak => leak.what), ['generateVAPIDKeys', 'value of a server variable (34 characters)']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log('Client bundle guard: light index allowed, full 2014 and 2024 sheets and 2014 spell texts in browser code or in the search index rejected; server keys, recipients and the push private key kept out of the browser code.');
})().catch(error => { console.error(error); process.exit(1); });
