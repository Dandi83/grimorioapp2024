import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url);
const expected = ["dardo-stregato","duello-obbligato","evoca-pioggia-di-armi","evoca-raffica","fame-di-hadar","faretra-rapida","fonte-di-luce-lunare","freccia-folgorante","frusta-di-spine","interdizione-alle-lame","manto-del-crociato","morte-apparente","nube-di-pugnali","onda-distruttiva","parola-del-potere-fortificare","parola-radiosa","percezione-delle-bestie","portale-arcano","presenza-regale-di-yolande","punizione-collerica","punizione-demoralizzante","punizione-esiliante","punizione-tonante","raffica-di-spine","rampicante-afferrante","richiama-aberrazione","richiama-bestia","richiama-celestiale","richiama-costrutto","richiama-elementale","richiama-folletto","richiama-immondo","richiama-non-morto","rintocco-dei-morti","scheggia-della-mente","scossa-sinaptica","telepatia","turbine-implacabile","vigore-arcano","manto-del-crociato-2014","punizione-accecante-2024","tempesta-radiosa","rombo-di-tuono"];
const dataUrl = new URL('lib/data/original-descriptions-2024.json', root);
assert.ok(existsSync(dataUrl), 'The 39 empty spells need original, sourced descriptions');
const data = JSON.parse(readFileSync(dataUrl, 'utf8'));
const detailPage = readFileSync(new URL('app/spell/[id]/page.tsx', root), 'utf8');
assert.ok(!detailPage.includes('Riferimento regole 2024'), 'Remove the rules reference link from all original summary pages');
assert.ok(!detailPage.includes('Riscontro consultato'), 'Remove the consulted reference link from all original summary pages');
assert.ok(detailPage.includes('Scheda completa dello spirito 2024'), 'Keep the required summoned spirit stat block links');
const canonical = JSON.parse(readFileSync(new URL('lib/data/srd-italiano-5.2.1.json', root), 'utf8'));
const legacy = JSON.parse(readFileSync(new URL('lib/data/srd-revisions-20261017.json', root), 'utf8'));
expected.push(...legacy.excluded.map(spell => spell.id));
function loadTs(relative) {
  const url = new URL(relative, root);
  const source = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', source)(id => {
    if (!id.startsWith('.')) return require(id);
    const dependency = new URL(id, url);
    if (id.endsWith('.json')) return JSON.parse(readFileSync(dependency, 'utf8'));
    return loadTs(new URL(dependency.href + (id.endsWith('.tsx') || id.endsWith('.ts') ? '' : '.ts')).href);
  }, mod, mod.exports);
  return mod.exports;
}
assert.equal(data.spells.length, 53);
assert.deepEqual(data.spells.map(s => s.id).sort(), [...expected].sort());
assert.deepEqual(JSON.parse(readFileSync(new URL('lib/data/original-description-ids.json',root),'utf8')).sort(), [...expected].sort());
const { applyOriginalDescription, getOriginalSource } = loadTs('lib/original-descriptions.ts');
const { hasUnverifiedDescription, isOriginalDescription } = loadTs('lib/spells-types.ts');
const { HtmlText } = loadTs('components/html-text.tsx');
for (const spell of data.spells) {
  assert.ok(spell.descrizione.length > 70, spell.id);
  assert.ok(!/not available|TODO|TBD|non disponibile/i.test(spell.descrizione), spell.id);
  // The 2014 summary: Roll20 has no free 2014 page any more, AideDD keeps the 2014 rules.
  assert.ok(spell.sourceUrl.startsWith(spell.edizione === '2014' ? 'https://www.aidedd.org/dnd/sorts.php?vo=' : 'https://roll20.net/compendium/dnd5e/Spells:'), spell.id);
  assert.ok(spell.referenceUrl.startsWith('https://'), spell.id);
  assert.ok(!canonical.spells.some(s => s.id === spell.id));
  assert.equal(isOriginalDescription(spell.id), true);
  assert.equal(hasUnverifiedDescription(spell.id), true);
  const empty = { id: spell.id, nome_italiano: 'KEEP NAME', descrizione: '  ', extra: 'keep' };
  const result = applyOriginalDescription(empty);
  assert.equal(result.descrizione, spell.descrizione);
  assert.equal(result.nome_italiano, 'KEEP NAME');
  assert.equal(result.extra, 'keep');
  assert.equal(empty.descrizione, '  ');
  const edit = { ...empty, descrizione: 'Modifica editoriale successiva' };
  assert.equal(applyOriginalDescription(edit), edit);
  assert.deepEqual(getOriginalSource(spell.id, result.descrizione), spell);
  assert.equal(getOriginalSource(spell.id, edit.descrizione), undefined);
  const html = renderToStaticMarkup(createElement(HtmlText, { html: spell.descrizione }));
  assert.ok(!/<script|javascript:|onerror=/.test(html));
  if (spell.descrizione.includes('Utilizzo di uno slot incantesimo di livello superiore')) assert.match(html, /<h3[^>]*text-primary/);
  if (spell.id.startsWith('richiama-')) assert.ok(spell.statBlockUrl?.startsWith('https://www.aidedd.org/monster/'), 'Summons require a linked 2024 creature stat block');
}
for (const spell of canonical.spells) {
  const row = { id: spell.id, descrizione: spell.descrizione };
  assert.equal(applyOriginalDescription(row), row);
  assert.equal(hasUnverifiedDescription(spell.id), false);
}
for (const spell of legacy.excluded) {
  const row = { id: spell.id, descrizione: 'Preesistente' };
  assert.equal(applyOriginalDescription(row), row);
  assert.equal(hasUnverifiedDescription(spell.id), true);
  assert.equal(isOriginalDescription(spell.id), true);
}
const unknown = { id: 'unknown', descrizione: '' };
assert.equal(applyOriginalDescription(unknown), unknown);
assert.equal(hasUnverifiedDescription('unknown'), false);
const byId = Object.fromEntries(data.spells.map(s => [s.id, s]));
assert.match(byId['dardo-stregato'].descrizione, /anche se.*mancat/i);
assert.match(byId['dardo-stregato'].descrizione, /2d12/);
assert.match(byId['freccia-folgorante'].tempo_di_lancio, /colpito o mancato/);
assert.equal(byId['punizione-collerica'].durata, '1 minuto');
assert.match(byId['punizione-demoralizzante'].descrizione, /Stordito/);
assert.match(byId['parola-del-potere-fortificare'].descrizione, /120/);
assert.match(byId['morte-apparente'].livello, /3°/);
assert.match(byId['richiama-non-morto'].livello, /3°/);
assert.match(byId['scheggia-della-mente'].livello, /Ammaliamento/);
assert.equal(data.replacements.length, 10);
assert.deepEqual(data.replacements.map(s => s.id).sort(), legacy.excluded.map(s => s.id).sort());
for (const replacement of [...data.replacements, ...data.revisions]) assert.match(replacement.previousDescriptionSha256, /^[a-f0-9]{64}$/);
assert.match(byId['cerchio-di-potere'].descrizione, /contro incantesimi e altri effetti magici/);
assert.match(byId['aura-di-vitalita'].descrizione, /inizio di ogni tuo turno/);
assert.match(byId['cordone-di-frecce'].descrizione, /2d4/);
assert.match(byId['armatura-di-agathys'].descrizione, /punti ferita temporanei/);
assert.equal(byId['armatura-di-agathys'].tempo_di_lancio, 'Azione bonus');
assert.match(byId['corona-di-follia'].descrizione, /azione di Magia/);
// PROMPT 8 (28/10/2026): the rewritten summaries replace only their exact previous text (an edit made later wins).
const { createHash } = await import('node:crypto');
assert.deepEqual(data.revisions.map(r => r.id).sort(), ['punizione-esiliante','richiama-aberrazione','richiama-bestia','richiama-celestiale','richiama-costrutto','richiama-elementale','richiama-folletto','richiama-immondo','richiama-non-morto']);
for (const revision of data.revisions) {
  const spell = byId[revision.id];
  assert.notEqual(createHash('sha256').update(spell.descrizione).digest('hex'), revision.previousDescriptionSha256, revision.id);
}
// No proper names or trademarks outside the SRD in the summaries and in the spirit statistics; no English variant names.
const BANNED = /\b(?:Beholder\w*|Mind Flayer|Illithid|Slaad|Yugoloth|Avenger|Defender|Fuming|Mirthful|Tricksy|Ghostly|Putrid|Skeletal|Jallarzi|Otiluke|Far Realm)\b/i;
for (const spell of data.spells) for (const field of ['nome_italiano', 'descrizione', 'statBlockSummary']) assert.ok(!BANNED.test(spell[field] ?? ''), `${spell.id} ${field}`);
assert.match(byId['richiama-aberrazione'].statBlockSummary, /Occhiuto.*Tentacolato|Rigenerante/s);
assert.match(byId['richiama-immondo'].statBlockSummary, /Mercenario/);
// The four cards added on 28/10/2026: read from the file (no database row), complete game data, 60–100 words.
const added = data.spells.filter(spell => spell.addedAt);
assert.deepEqual(added.map(s => s.id), ['manto-del-crociato-2014','punizione-accecante-2024','tempesta-radiosa','rombo-di-tuono']);
for (const spell of added) {
  for (const field of ['nome_italiano','livello','tempo_di_lancio','gittata','componenti','durata','descrizione']) assert.ok(spell[field]?.trim(), `${spell.id} ${field}`);
  const words = spell.descrizione.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  assert.ok(words >= 60 && words <= 100, `${spell.id}: ${words} words`);
}
assert.equal(byId['manto-del-crociato-2014'].edizione, '2014');
for (const id of ['punizione-accecante-2024','tempesta-radiosa','rombo-di-tuono']) assert.equal(byId[id].edizione, undefined);
assert.match(byId['punizione-accecante-2024'].livello, /3°/);
assert.match(byId['tempesta-radiosa'].livello, /5°/);
assert.match(byId['rombo-di-tuono'].livello, /^Trucchetto/);
console.log('[originals] 53 original descriptions (marked NO SRD on the sheet; one 2014); hash-guarded replacements and revisions, source references and preservation verified.');
