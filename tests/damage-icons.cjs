const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const {createElement}=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const m={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync('components/html-text.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText)(require,m,m.exports);
const render=(html,damageIcons=true)=>renderToStaticMarkup(createElement(m.exports.HtmlText,{html,damageIcons}));
for(const [word,id] of Object.entries({fuoco:'fire',freddo:'cold',fulmine:'lightning',tuono:'thunder',veleno:'poison',acido:'acid',forza:'force',necrotici:'necrotic',radianti:'radiant',psichici:'psychic',contundenti:'bludgeoning',perforanti:'piercing',taglienti:'slashing'})){
 assert.ok(render(`Subisce 2d6 danni da ${word}.`).includes(`/damage-icons/${id}.png`),word);
}
assert.ok(render('Immunità al fuoco.').includes('/damage-icons/fire.png'));
assert.equal((render('Resistenza al fuoco, al freddo e al veleno.').match(/data-damage-type=/g)||[]).length,3);
assert.equal((render('Danni da <strong>fuoco</strong> e da <em>freddo</em>.').match(/data-damage-type=/g)||[]).length,2);
for(const text of ['Tiro salvezza su Forza.','Un muro di forza.','Il fuoco illumina la stanza.','Subisce danni da fuoco e deve superare un tiro salvezza su Forza.']){
 assert.ok(!render(text).includes('/damage-icons/force.png'),text);
}
assert.ok(!render('Il fuoco illumina la stanza.').includes('data-damage-type='));
assert.ok(!render('Danni da fuoco.',false).includes('data-damage-type='));
assert.ok(!render('Danni da fuoco <img src=x onerror=alert(1)>').includes('onerror="'));
const plain=s=>s.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s/g,'');
const spells=JSON.parse(fs.readFileSync('lib/data/srd-italiano-5.2.1.json')).spells;
for(const s of spells)assert.equal(plain(render(s.descrizione)),plain(render(s.descrizione,false)),s.id+': source text preserved');
console.log('Damage icons: 13 types, repeated lists, formatting boundaries, ability disambiguation, opt-in, safe rendering and all source texts passed');

// Damage lists carry their meaning in the stat label, separate from the value.
assert.equal(typeof m.exports.DamageText,'function','shared inline damage renderer');
const inline=(text,context='')=>renderToStaticMarkup(createElement(m.exports.DamageText,{text,context}));
for(const context of ['Resistenze','Immunità ai Danni','Vulnerabilità','Immunità']){
 const html=inline('Fuoco, Freddo; Contundenti, Perforanti e Taglienti',context);
 assert.equal((html.match(/data-damage-type=/g)||[]).length,5,context);
 assert.ok(!html.includes('<p'),'inline stats must not contain nested paragraphs');
}
assert.ok(!inline('Forza +5, Destrezza +3').includes('data-damage-type='));
assert.ok(!inline('Il fuoco illumina la stanza.').includes('data-damage-type='));
for(const file of ['srd-monsters-5.2.1-it.json','original-descriptions-2024.json']){
 const data=JSON.parse(fs.readFileSync(`lib/data/${file}`));
 const records=data.records||data.spells;
 for(const record of records){
  const item=record.monster||record;
  for(const [field,value] of Object.entries(item)){
   if(typeof value!=='string')continue;
   assert.equal(plain(render(value)),plain(render(value,false)),`${file}:${item.id}:${field}: preserved text`);
  }
 }
}
console.log('Shared inline damage lists and monster/original-spell text preservation passed');
const wrappedTable=render('<pre>Raggio. 12d6 danni da\n  acido e 12d6 danni da ful-\n  mine.</pre>');
assert.ok(wrappedTable.includes('/damage-icons/acid.png'),'damage context survives visual table line wraps');
assert.ok(wrappedTable.includes('/damage-icons/lightning.png'),'PDF hyphenation in damage type is recognized');
assert.ok(!render('<pre>Temperatura\n5 Freddo\n6 Gelido</pre>').includes('data-damage-type='),'weather table is not damage');

const conditionReferences=[{label:'paralizzato',href:'/manuale/condizioni-paralizzato'}];
const linked=renderToStaticMarkup(createElement(m.exports.HtmlText,{html:'Il bersaglio è <strong>paralizzato</strong> e subisce 2d6 danni da fuoco.',damageIcons:true,references:conditionReferences}));
assert.ok(linked.includes('href="/manuale/condizioni-paralizzato"'),'condition mention links to the condition detail');
assert.ok(linked.includes('underline-offset-4'),'inline reference is visibly underlined');
assert.ok(linked.includes('/damage-icons/fire.png'),'damage icons survive beside condition links');
assert.equal(plain(linked),plain(render('Il bersaglio è <strong>paralizzato</strong> e subisce 2d6 danni da fuoco.')),'reference preserves source words');
assert.ok(!renderToStaticMarkup(createElement(m.exports.HtmlText,{html:'Una presenza paralizzatissima.',references:conditionReferences})).includes('href='),'only whole condition words link');

const conditionsModule={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync('lib/conditions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(id=>id.endsWith('.json')?JSON.parse(fs.readFileSync('lib/'+id.replace(/^\.\//,''))):require(id),conditionsModule,conditionsModule.exports);
const allReferences=conditionsModule.exports.inlineConditionReferences;
assert.ok(Array.isArray(allReferences),'all conditions expose reusable inflected references');
assert.equal(new Set(allReferences.map(r=>r.href)).size,15,'all 15 conditions have destinations');
for(const word of ['paralizzata','afferrati','invisibili','priva di sensi','indebolimento']){
 const html=renderToStaticMarkup(createElement(m.exports.HtmlText,{html:`Il bersaglio è ${word}.`,references:allReferences}));
 assert.ok(html.includes('href="/manuale/condizioni-'),word);
}
const tableLink=renderToStaticMarkup(createElement(m.exports.HtmlText,{html:'<pre>Il bersaglio è tratte-\n  nuto e privo\n  di sensi.</pre>',references:allReferences}));
assert.equal((tableLink.match(/href="\/manuale\/condizioni-/g)||[]).length,2,'condition links survive PDF hyphenation and table line wraps');

let checkedConditionTexts=0;
for(const file of ['srd-italiano-5.2.1.json','original-descriptions-2024.json','srd-monsters-5.2.1-it.json','srd-animals-5.2.1-it.json']){
 const data=JSON.parse(fs.readFileSync(`lib/data/${file}`));
 for(const record of data.records||data.spells){
  const item=record.monster||record;
  for(const field of ['descrizione','tratti','azioni','azioni_bonus','reazioni','azioni_leggendarie','immunita','immunita_danni','immunita_condizioni','resistenze','vulnerabilita']){
   const value=item[field];if(!value)continue;
   const html=renderToStaticMarkup(createElement(m.exports.HtmlText,{html:value,damageIcons:true,references:allReferences}));
   assert.equal(plain(html),plain(render(value)),`${item.id} ${field}: condition links preserve text`);
   for(const condition of conditionsModule.exports.findConditions(value))assert.ok(html.includes(`href="/manuale/${condition.id}"`),`${item.id} ${field}: missing inline ${condition.title}`);
   checkedConditionTexts++;
  }
 }
}
console.log('Condition links: all 15 destinations, inflections, PDF table wraps and',checkedConditionTexts,'source fields passed');
