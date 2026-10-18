import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const require=createRequire(import.meta.url);
const helper=new URL('../lib/srd-monsters.ts',import.meta.url);
assert.ok(existsSync(helper),'The approved Aboleth must be available without changing the shared database');
const data=JSON.parse(readFileSync(new URL('../lib/data/srd-monster-sample.json',import.meta.url),'utf8'));
const code=ts.transpileModule(readFileSync(helper,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
const mod={exports:{}};
new Function('require','module','exports',code)(id=>id.endsWith('.json')?JSON.parse(readFileSync(new URL('../lib/'+id.replace(/^\.\//,''),import.meta.url),'utf8')):require(id),mod,mod.exports);
const {previewMonsters,previewMonsterById,getSrdMonsterSource}=mod.exports;
const goblin={id:'goblin',nome:'Goblin',descrizione:'Existing custom text'};
const rows=[goblin];
assert.equal(previewMonsters(rows,'production').length,331,'Publishing must include Aboleth in the production catalog');
assert.equal(previewMonsters(rows,undefined),rows);
assert.equal(previewMonsterById('aboleth','production')?.nome,'Aboleth','Publishing must enable the Aboleth detail page in production');
assert.equal(previewMonsterById('aboleth',undefined),undefined);
assert.equal(previewMonsterById('unknown','preview'),undefined);
const staged=previewMonsters(rows,'preview');
assert.equal(staged.length,331);
assert.equal(rows.length,1);
assert.equal(staged.find(m=>m.id==='goblin'),goblin);
const sample=previewMonsterById('aboleth','preview');
assert.deepEqual(previewMonsterById('aboleth','production'),sample,'The released monster must be identical to the approved preview');
assert.equal(sample.nome,'Aboleth');
assert.equal(sample.classe_armatura,'17');
assert.equal(sample.punti_ferita,'150 (20d10 + 40)');
assert.equal(sample.iniziativa,'+7 (17)');
assert.equal(sample.bonus_competenza,'+4');
assert.equal(sample.gs_num,10);
assert.deepEqual(['forza','destrezza','costituzione','intelligenza','saggezza','carisma'].map(k=>sample[k]),[21,9,15,18,15,18]);
assert.ok(sample.tratti.includes('3/giorno o 4/giorno nella tana'));
assert.ok(sample.tratti.includes("non può recuperare punti ferita finché si trova sott'acqua"));
assert.ok(sample.tratti.includes('6 (1d12) danni da acido'));
assert.ok(sample.azioni.includes('12 (2d6 + 5)'));
assert.ok(sample.azioni.includes('Domina mente (2/giorno)'));
assert.ok(sample.azioni_leggendarie.includes('3 (4 nella tana)'));
assert.ok(sample.azioni_leggendarie.includes('5 (1d10)'));
assert.equal(getSrdMonsterSource(sample).page,294);
assert.equal(getSrdMonsterSource({...sample,azioni:'Custom edit'}),undefined,'Edited content must not be labeled as an exact SRD transcription');
const custom={...sample,azioni:'Custom edit'};
assert.equal(previewMonsters([goblin,custom],'preview').find(m=>m.id==='aboleth'),custom);
assert.equal(previewMonsters([goblin,custom],'preview').length,331);
assert.equal(previewMonsters([goblin,custom],'production').find(m=>m.id==='aboleth'),custom);

// Render the real detail page: a missing PX label must fail this assertion.
function loadTs(relativePath, dependencies={}) {
  const output=ts.transpileModule(readFileSync(new URL(relativePath,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const loaded={exports:{}};
  new Function('require','module','exports',output)(id=>dependencies[id]??createRequire(new URL(relativePath,import.meta.url))(id),loaded,loaded.exports);
  return loaded.exports;
}
let selected=sample;
const page=loadTs('../app/mostro/[id]/page.tsx',{
  'next/image':{__esModule:true,default:()=>null},
  'next/link':{__esModule:true,default:({children,...props})=>createElement('a',props,children)},
  'next/navigation':{notFound:()=>{throw new Error('Not found');}},
  '@/components/condition-references':{ConditionReferences:()=>null},
  '@/components/spell-references':{SpellReferences:()=>null},
  '@/components/back-button':{BackButton:()=>null},
  '@/components/favorite-button':{FavoriteButton:()=>null},
  '@/components/html-text':loadTs('../components/html-text.tsx'),
  '@/lib/monsters':{getMonsterById:async id=>id===selected.id?selected:undefined},
  '@/lib/spell-references':loadTs('../lib/spell-references.ts'),
  '@/lib/conditions':loadTs('../lib/conditions.ts'),
  '@/lib/monsters-types':loadTs('../lib/monsters-types.ts'),
  '@/lib/srd-monsters':mod.exports,
}).default;
const html=renderToStaticMarkup(await page({params:Promise.resolve({id:'aboleth'})}));
const header=html.match(/<header[\s\S]*?<\/header>/)[0].replace(/<[^>]+>/g,'');
assert.ok(header.includes('GS 10 · PX 5.900, o 7.200 nella tana'),'Experience values must be explicitly labeled PX in the monster header');
assert.ok(html.includes('#page=294'));
assert.ok(html.includes('Attribuzione e licenza'));
selected={...sample,px:'50 PX'};
const labeledHtml=renderToStaticMarkup(await page({params:Promise.resolve({id:'aboleth'})}));
const labeledHeader=labeledHtml.match(/<header[\s\S]*?<\/header>/)[0].replace(/<[^>]+>/g,'');
assert.ok(labeledHeader.includes('GS 10 · 50 PX'),'Existing PX labels must be preserved without duplication');
assert.ok(!labeledHeader.includes('PX 50 PX'));
selected={...sample,px:''};
const noXpHtml=renderToStaticMarkup(await page({params:Promise.resolve({id:'aboleth'})}));
assert.ok(!noXpHtml.match(/<header[\s\S]*?<\/header>/)[0].includes(' · PX'),'An empty XP value must not leave a dangling label');
console.log('[monsters] Aboleth statistics, production/preview parity, existing records, PX label and exact-source attribution verified.');
