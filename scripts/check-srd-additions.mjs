import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require=createRequire(import.meta.url);
const data=JSON.parse(readFileSync(new URL('../lib/data/srd-italiano-5.2.1.json',import.meta.url),'utf8'));
const manifest=JSON.parse(readFileSync(new URL('../lib/data/srd-additions-20261017.json',import.meta.url),'utf8'));
const helperUrl=new URL('../lib/srd-additions.ts',import.meta.url);
assert.ok(existsSync(helperUrl), 'The preview must expose all 20 missing spells without writing the shared production database');
function loadTs(url){
  const code=ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,esModuleInterop:true,resolveJsonModule:true}}).outputText;
  const mod={exports:{}};
  new Function('require','module','exports',code)(id=>id.endsWith('srd-additions-20261017.json')?manifest:id.endsWith('srd-italiano-5.2.1.json')?data
    :id.endsWith('.json')?JSON.parse(readFileSync(new URL(id,url),'utf8')):id.startsWith('./')?loadTs(new URL(`${id}.ts`,url)):require(id),mod,mod.exports);
  return mod.exports;
}
const mod={exports:loadTs(helperUrl)};
// The four original summaries added on 28/10/2026 are read from the files in the same way (lib/original-descriptions.ts).
const ADDED_SUMMARIES=4;
const {previewSpellRows,previewSpellById}=mod.exports;
const existing=[{id:'legacy-custom',nome_italiano:'PERSONALE',descrizione:'Testo conservato',livello:'Trucchetto di Illusione (mago)'}];
assert.deepEqual(previewSpellRows(existing,'production'),previewSpellRows(existing,'preview'), 'Released catalog must match preview without changing database rows');
assert.equal(previewSpellRows(existing,undefined),existing, 'Local/dev must not silently add virtual rows');
const staged=previewSpellRows(existing,'preview');
assert.equal(staged.length,21+ADDED_SUMMARIES);
assert.equal(existing.length,1, 'Staging must not mutate database results');
assert.ok(staged.includes(existing[0]), 'Existing rows must remain unchanged');
const fireball=previewSpellById('palla-di-fuoco','preview');
assert.equal(fireball.nome_italiano,'PALLA DI FUOCO');
assert.ok(fireball.descrizione.includes('8d6'));
assert.equal(fireball.livello,'Invocazione di 3º livello (mago, stregone)');
assert.deepEqual(previewSpellById('palla-di-fuoco','production'),fireball);
assert.equal(previewSpellById('dardo-stregato','preview'),undefined);
assert.equal(previewSpellById('tempesta-radiosa','preview').nome_italiano,'TEMPESTA RADIOSA');
assert.equal(previewSpellById('tempesta-radiosa',undefined),undefined);
const custom={...fireball,descrizione:'Modifica successiva'};
const merged=previewSpellRows([custom],'preview');
assert.equal(merged.length,20+ADDED_SUMMARIES);
assert.equal(merged.find(s=>s.id===custom.id),custom, 'Database rows must win over staged content');
assert.equal(new Set(merged.map(s=>s.id)).size,20+ADDED_SUMMARIES, 'No duplicate IDs');
assert.deepEqual(staged.map(s=>s.nome_italiano),[...staged].sort((a,b)=>a.nome_italiano.localeCompare(b.nome_italiano,'it')).map(s=>s.nome_italiano));
assert.ok(existsSync(new URL('./migrations/add-20-srd.mjs',import.meta.url)), 'The approved production release needs a guarded transactional insertion');
console.log('[srd] All 20 preview additions, database precedence and production isolation verified.');
