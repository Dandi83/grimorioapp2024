// Scheda TPK v1 (PROMPT 61): the shared file of Total Party Kill, copied byte for byte into lib/shared/ (lib/shared/README.md).
// Here the Grimorio checks its own side: the file is unchanged, the example link of Brenna decodes, and every id of the
// file exists in the Grimorio (classes, feats, skills, the table of the spell addresses, Brenna's spells).
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');

// 1. Unchanged: a change is made in TPK first, then copied here with the new SHA-256 (README).
const SHA256 = 'ff612fa10daf4069f0d4da488cb8967ced4c5bee5f5b8e6e1d24533af5a5669b';
const source = fs.readFileSync('lib/shared/scheda-tpk-v1.ts');
assert.equal(crypto.createHash('sha256').update(source).digest('hex'), SHA256, 'lib/shared/scheda-tpk-v1.ts differs from the copy of TPK: change it in TPK, then copy it again');

const tpk = require('../lib/shared/scheda-tpk-v1.ts');
const { CLASS_IDS } = require('../lib/classes-types.ts');
const { feats } = require('../lib/feats.ts');
const { PUBLIC_SPELL_IDS, publicSpellId } = require('../lib/spell-public-id.ts');
const classesData = require('../lib/data/srd-classes-5.2.1-it.json');
const srdSpells2024 = require('../lib/data/spell-reference-index.json');
const monsters2024 = require('../lib/data/srd-monsters-5.2.1-it.json');

const slug = text => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const missing = (ids, known) => [...ids].filter(id => !known.has(id));

(async () => {
  // 2. Brenna: a druid of the Land, level 3, wood elf, sage, with the exporter's values.
  const BRENNA = '#pg=TZLBjtswDET_Zc5Su042aKHb9jeCHBiJcYmVJZeSc0jgfy-oYpGe7JGfZ6gBn7gjTA4FAb-USyE4RAQk3SRVOLSX-t5Z1YCMcHRoKwI43wZVEXCtLf4WOFxnBDRahUtn09QY4Twd3HR007ub3tx0cj8vDtcrwhONZoSDQ6wNYdod2ifCGaSRynDvVcWCKSVuXUnZU5GFsqVJ6Zs8pBbGxeHWEc5PSEKAFHkI9eopZ_ILzcNkjDrDYbXsLK0TAhaaLSqSjtnte1ebIpGm6pP421ajIUrzLONk5lwtU8ooaYBSIpVOvWLfLw5LQzhfvrxWrWlTZX8TWhYaZiVxzv__Z83q9nhUf-fMpbaRsQ6DuCn5G6uMXqV0pRyF1FTeFincIpeHOa-kNZOfN1LpKtGQVWvnUZVPlP2VC_t_rwvlAXDO7KPVHZksNzZraa2vijIVK3et2XJ3h3w35DC4G8KP3eH4ErsD_zH5iYCPsR0fCF033q3uHL_Qw7tphMmeCWE6OlDvCCe7qYw9vXNGmN6-nfb9Lw';
  const decoded = await tpk.decodeHash(BRENNA);
  assert.equal(decoded.ok, true, `Brenna does not decode: ${JSON.stringify(decoded)}`);
  const [brenna] = decoded.schede ?? [decoded.scheda];
  assert.ok(brenna, `Brenna: no sheet in ${JSON.stringify(Object.keys(decoded))}`);
  assert.deepEqual(tpk.validaScheda(brenna), [], 'Brenna is valid');
  assert.equal(brenna.c, 'druido');
  assert.equal(brenna.sc, 'druido/terra');
  assert.equal(brenna.l, 3);
  assert.equal(brenna.sp, 'elfo');
  assert.equal(brenna.so, 'boschi');
  assert.equal(brenna.bg, 'sapiente');
  assert.ok(brenna.calc && typeof brenna.calc.pf === 'number' && typeof brenna.calc.ca === 'number', 'Brenna has the calculated values');

  // 3. Every id of the file exists in the Grimorio.
  // Classes: the pages /classi/<id>; subclasses: their class, and the SRD 5.2.1 subclass of that class.
  assert.deepEqual(missing(tpk.CLASSI, new Set(CLASS_IDS)), [], 'classes without a page /classi/<id>');
  const subclassTitles = new Map(classesData.classi.map(c => [c.id, slug(JSON.stringify(c.sottoclasse ?? c.sottoclassi ?? ''))]));
  const badSubclasses = tpk.SOTTOCLASSI.filter(id => { const [c, s] = id.split('/'); return !CLASS_IDS.includes(c) || !(subclassTitles.get(c) ?? '').includes(s); });
  assert.deepEqual(badSubclasses, [], 'subclasses not found in the SRD 5.2.1 classes of the Grimorio');
  // Feats: lib/feats.ts (the /talenti pages).
  assert.deepEqual(missing(tpk.TALENTI, new Set(feats.map(feat => feat.id))), [], 'feats without a page /talenti/<id>');
  // Skills: the names of the SRD 5.2.1 of the Grimorio, in the «Competenze nelle abilità» of the classes and the «Abilità»
  // of the creatures (Intrattenere is in no class list: the bard chooses any skill).
  const skills = new Set();
  for (const c of classesData.classi) for (const voce of c.tratti?.voci ?? []) if (/abilit/i.test(voce.etichetta))
    for (const name of voce.valore.replace(/^.*?:/, '').split(/,| o /)) if (name.trim()) skills.add(slug(name.trim()));
  for (const { monster } of monsters2024.records) for (const part of (monster.abilita ?? '').split(','))
    { const name = part.replace(/[+−-]\s*\d+.*$/, '').trim(); if (name) skills.add(slug(name)); }
  assert.deepEqual(missing(tpk.ABILITA, skills), [], 'skills not named by the SRD 5.2.1 classes and creatures of the Grimorio');
  // The table of the spell addresses in the file: the same as lib/data/public-spell-ids.json today.
  const ids = Object.keys(PUBLIC_SPELL_IDS);
  for (const id of ids) assert.equal(tpk.idPubblicoIncantesimo(id), PUBLIC_SPELL_IDS[id], `spell address of ${id}: TPK and the Grimorio differ`);
  for (const id of ids) assert.equal(tpk.idSalvatoIncantesimo(PUBLIC_SPELL_IDS[id]), id, `stored id of ${PUBLIC_SPELL_IDS[id]}`);
  const table = /<tabella-id-pubblici>([\s\S]*?)<\/tabella-id-pubblici>/.exec(source.toString('utf8'))[1];
  const entries = [...table.matchAll(/"([^"]+)": "([^"]+)"/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(Object.fromEntries(entries), PUBLIC_SPELL_IDS, 'the table of the spell addresses of TPK differs from lib/data/public-spell-ids.json: copy the new table into TPK');

  // 4. Brenna's spells (species cantrip, cantrips, prepared, book, feat spells): public 2024 ids of the Grimorio.
  const public2024 = new Set(srdSpells2024.map(spell => publicSpellId(spell.id)));
  const spells = [brenna.st, ...brenna.tr, ...brenna.pr, ...(brenna.lb ?? []), ...brenna.ft.flatMap(f => [f.p?.tr, f.p?.inc].flat())].filter(Boolean);
  assert.ok(spells.length >= 4, `Brenna's spells: ${spells}`);
  assert.deepEqual(missing(spells, public2024), [], 'spells of Brenna without a public 2024 card');

  console.log(`Scheda TPK v1: SHA-256 unchanged; Brenna (druido/terra, 3º, elfo dei boschi, sapiente) decodes; ${tpk.CLASSI.length} classes, ${tpk.SOTTOCLASSI.length} subclasses, ${tpk.TALENTI.length} feats, ${tpk.ABILITA.length} skills and ${entries.length} spell addresses as in the Grimorio; ${spells.length} spells of Brenna with a 2024 card.`);
})().catch(error => { console.error(error); process.exit(1); });
