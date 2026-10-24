import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {createElement} from 'react';
const legacyCount=JSON.parse(readFileSync(new URL('../lib/data/srd-monsters-5.1-it.json',import.meta.url),'utf8')).records.length;
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
assert.equal(previewMonsters(rows,'production').length,331+legacyCount,'Publishing must include Aboleth in the production catalog');
assert.equal(previewMonsters(rows,undefined),rows);
assert.equal(previewMonsterById('aboleth','production')?.nome,'Aboleth','Publishing must enable the Aboleth detail page in production');
assert.equal(previewMonsterById('aboleth',undefined),undefined);
assert.equal(previewMonsterById('unknown','preview'),undefined);
const staged=previewMonsters(rows,'preview');
assert.equal(staged.length,331+legacyCount);
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
assert.equal(previewMonsters([goblin,custom],'preview').length,331+legacyCount);
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
  '@/components/monster-provenance-badge':loadTs('../components/monster-provenance-badge.tsx'),
  '@/components/condition-references':{ConditionReferences:()=>null},
  '@/components/back-button':{BackButton:()=>null},'@/components/admin-edit/admin-edit-button':{AdminEditButton:()=>null,AdminEditPencil:()=>null},
  '@/components/meta-cell':loadTs('../components/meta-cell.tsx'),
  '@/components/share-button':{ShareButton:()=>null},'@/components/feedback/report-link':{ReportLink:()=>null},'@/components/favorite-button':{FavoriteButton:()=>null},
  '@/components/html-text':loadTs('../components/html-text.tsx'),
  '@/lib/monsters':{getMonsterById:async id=>id===selected.id?selected:undefined},
  '@/lib/spell-references':loadTs('../lib/spell-references.ts'),
  '@/lib/conditions':loadTs('../lib/conditions.ts'),
  '@/lib/monsters-types':loadTs('../lib/monsters-types.ts'),
  '@/lib/public-sections':loadTs('../lib/public-sections.ts'),
  '@/lib/section-view':{visibleCards:async(k,l)=>l,bestiaryList:async l=>l,markedCards:async(k,l)=>l,cardHidden:async()=>false,cardsOut:async()=>[],sectionView:async()=>({admin:false,hidden:[],hiddenParts:[],hiddenCards:[]}),sectionsOut:async()=>[],partsOut:async()=>[],linksOut:async()=>[],partState:async()=>({shown:true,hidden:false}),editionCard:async()=>false,pageEditions:async()=>['2024','2014']},'@/components/sections/hidden-card-bar':{HiddenCardBar:()=>null},'@/components/homebrew/homebrew-sheet':{HomebrewLabel:()=>null,HomebrewNote:()=>null},'@/lib/homebrew-types':{authorLine:()=>''},'@/components/sections/part-block':{HiddenPartBar:()=>null,PartBlock:({children})=>children},
  '@/lib/srd-monsters':mod.exports,
  '@/components/monster-sheet':loadTs('../components/monster-sheet.tsx',{'@/components/html-text':loadTs('../components/html-text.tsx'),'@/lib/spell-references':loadTs('../lib/spell-references.ts'),'@/lib/conditions':loadTs('../lib/conditions.ts'),'@/lib/monsters-types':loadTs('../lib/monsters-types.ts'),'@/lib/public-sections':loadTs('../lib/public-sections.ts')}),
}).default;
const html=renderToStaticMarkup(await page({params:Promise.resolve({id:'aboleth'})}));
// Challenge line below the languages: GS, experience (PE) and proficiency bonus.
const text=markup=>markup.replace(/<[^>]+>/g,'').replace(/\s+/g,' ');
assert.ok(text(html).includes(`Grado sfida 10 (5.900 PE, o 7.200 nella tana; bonus di competenza ${sample.bonus_competenza})`),'Experience values must be labeled PE on the challenge line');
assert.ok(text(html).indexOf('Linguaggi')<text(html).indexOf('Grado sfida'),'the challenge line follows the languages');
assert.ok(html.includes('#page=294'));
assert.ok(html.includes('Attribuzione e licenza'));
selected={...sample,px:'50 PX'};
const labeledHtml=renderToStaticMarkup(await page({params:Promise.resolve({id:'aboleth'})}));
assert.ok(text(labeledHtml).includes('Grado sfida 10 (50 PX;'),'Existing labels must be preserved without duplication');
assert.ok(!text(labeledHtml).includes('50 PX PE'));
selected={...sample,px:''};
const noXpHtml=renderToStaticMarkup(await page({params:Promise.resolve({id:'aboleth'})}));
assert.ok(!text(noXpHtml).includes(' PE'),'An empty XP value must not leave a dangling label');
console.log('[monsters] Aboleth statistics, production/preview parity, existing records, PE on the challenge line and exact-source attribution verified.');
