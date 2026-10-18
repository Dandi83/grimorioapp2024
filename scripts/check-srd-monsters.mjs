import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const data=JSON.parse(read('lib/data/srd-monsters-5.2.1-it.json'));
function load(path,deps={}){const m={exports:{}};const code=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;new Function('require','module','exports',code)(id=>deps[id]??(id.endsWith('.json')?JSON.parse(read('lib/'+id.replace(/^\.\//,''))):require(id)),m,m.exports);return m.exports;}
const provider=load('lib/srd-monsters.ts');
assert.equal(provider.previewMonsters([],'preview').length,330,'Preview must contain all 235 SRD records');
const sample=JSON.parse(read('lib/data/srd-monster-sample.json')).monster;
assert.deepEqual(provider.previewMonsters([],'production'),provider.previewMonsters([],'preview'),'Production must match the approved catalog');
const legacy={id:'goblin',nome:'Goblin',descrizione:'Preserved custom text'};
const custom={...sample,azioni:'Custom edit'};
const result=provider.previewMonsters([legacy,custom],'preview');
assert.equal(result.length,331);assert.equal(result.find(x=>x.id==='goblin'),legacy);assert.equal(result.find(x=>x.id==='aboleth'),custom);
assert.equal(new Set(result.map(x=>x.id)).size,result.length);
assert.equal(provider.getSrdMonsterSource(custom),undefined);
for(const r of data.records){const m=provider.previewMonsterById(r.monster.id,'preview');assert.deepEqual(m,r.monster);assert.equal(provider.getSrdMonsterSource(m).page,r.page);assert.deepEqual(provider.previewMonsterById(m.id,'production'),m);assert.equal(provider.getSrdMonsterSource({...m,azioni_bonus:'An unauthorized additional power'}),undefined);}
const types=load('lib/monsters-types.ts');
assert.equal(types.typeCategory('Folletto (goblinoide)'),'Fata');assert.equal(types.typeCategory('Vegetale'),'Pianta');assert.equal(types.typeCategory('Sciame di non morti Minuscoli'),'Non morto');
let selected;
const page=load('app/mostro/[id]/page.tsx',{
 '@/components/condition-references':{ConditionReferences:()=>null}, '@/components/spell-references':{SpellReferences:()=>null},
 'next/image':{__esModule:true,default:()=>null},'next/link':{__esModule:true,default:({children,...props})=>createElement('a',props,children)},'next/navigation':{notFound:()=>{throw Error('Not found')}},
 '@/components/back-button':{BackButton:()=>null},'@/components/favorite-button':{FavoriteButton:()=>null},'@/components/html-text':load('components/html-text.tsx'),'@/lib/monsters':{getMonsterById:async()=>selected},'@/lib/conditions':load('lib/conditions.ts'),'@/lib/monsters-types':types,'@/lib/srd-monsters':provider
}).default;
for(const r of data.records){selected=r.monster;const markup=renderToStaticMarkup(await page({params:Promise.resolve({id:selected.id})}));assert.ok(markup.includes(`#page=${r.page}`));assert.ok(markup.includes('Attribuzione e licenza'));if(selected.id==='aboleth')for(const type of ['acid','bludgeoning','psychic'])assert.ok(markup.includes(`data-damage-type="${type}"`),`Aboleth missing ${type} icon in real detail page`);if(selected.immunita_danni==='Fuoco')assert.ok(markup.includes('data-damage-type="fire"'),'Fire immunity list must show its icon');const plain=markup.replace(/<[^>]+>/g,'');for(const [field,label] of [['azioni_bonus','Azioni Bonus'],['attrezzatura','Attrezzatura'],['immunita','Immunità']])if(selected[field])assert.ok(plain.toLowerCase().includes(label.toLowerCase()),`${selected.nome}: ${label} not rendered`);if(!selected.azioni_bonus)assert.ok(!markup.includes('>Azioni Bonus<'));}
console.log('[monsters] 235 released records, production parity, DB precedence, exact-source attribution, filters and all detail renders verified.');
