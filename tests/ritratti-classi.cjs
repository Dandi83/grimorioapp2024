// PROMPT 64: the 12 portraits of the classes (from Total Party Kill, commit 282bb6c, docs/grimorio/ritratti-classi),
// copied byte for byte to public/ritratti/classi; used only by «I miei personaggi», never by other pages or the
// service worker, never loaded from totalpartykill.app; the credit is on /fonti.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { CLASS_NAMES } = require('../lib/characters-beta.ts');

const SHA256 = {
  barbaro: '78c9b53fe42560efb2d6278d1ff09a5b069e9b11bc50dc36749d7b0dbb4c347a',
  bardo: '51e607b8d3039d629d24030fea48a5fb7a9162e3d0622f75e5915a0136d01425',
  chierico: '6b4890b262fb0d6e16e56fd235f1ad6c7dae45ba5b34e383efe9acd414422fda',
  druido: '624852e02cf109bc438cd7f4dad9bf445856a1da9308790cb7e591314bcce7a6',
  guerriero: 'd59b47177082ffbca4cd6c55a0b04697640370163ae7b93200c8d7c8ae4e7a30',
  ladro: '3db62e2214c08ded1568577590691965a4b173978b3d91fd62a484be224e869f',
  mago: 'ef258c9a6cab736b1743d3d446b82d64106439b057d47909e2a718ae635289e8',
  monaco: '0be4601fb1de86e8b00065badf0488e76d0f59cefa16a331cba37d564e556aa4',
  paladino: '4095aa5a438fc6d4fc1035682011a2695da7d1a9c9d7aa1e768bd3639063f84b',
  ranger: '89cbdcd2f22e675505138167053831eac2cbf35bc62703805f5d8bd5b9047b65',
  stregone: '3168ff49b51ecd6318f6dae6868b89ef1f26d3b7a05aa8083c9263dece7d2747',
  warlock: '9e6b03aaf266588181a7b3c3dd5a8b982a686c15e058a996cd6070b857560a7b',
};

// Exactly the 12 classes of the page, each file with its fingerprint, nothing else in the folder.
assert.deepEqual(Object.keys(SHA256).sort(), Object.keys(CLASS_NAMES).sort());
const dir = 'public/ritratti/classi';
assert.deepEqual(fs.readdirSync(dir).sort(), Object.keys(SHA256).map(id => `classe-${id}.webp`).sort());
for (const [id, sha] of Object.entries(SHA256)) {
  const bytes = fs.readFileSync(path.join(dir, `classe-${id}.webp`));
  assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', id);
  assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', id);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), sha, id);
}

// Only components/characters-beta refers to them; nothing preloads them; never the address of Total Party Kill.
function files(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) return files(full);
    return /\.(tsx?|jsx?|mjs|css)$/.test(entry.name) ? [full] : [];
  });
}
const users = ['app', 'components', 'lib'].flatMap(files).filter(file => fs.readFileSync(file, 'utf8').includes('/ritratti/'));
assert.deepEqual(users, ['components/characters-beta/characters-app.tsx']);
const page = fs.readFileSync(users[0], 'utf8');
assert.match(page, /loading="lazy"/);
assert.match(page, /unoptimized/);
assert.doesNotMatch(page, /totalpartykill\.app\/[^"`]*ritratt/);
assert.doesNotMatch(page, /preload|priority/);
assert.doesNotMatch(fs.readFileSync('lib/sw/service-worker.js', 'utf8'), /ritratti/);

// The credit on /fonti, in the section about the graphics of the app.
assert.match(fs.readFileSync('app/fonti/page.tsx', 'utf8'), /Grafica dell’app[\s\S]*Ritratti delle classi: grafica originale © 2026 D\.d\.B\./);

console.log('ritratti-classi: 12 ritratti identici, solo in «I miei personaggi», credito in /fonti');
