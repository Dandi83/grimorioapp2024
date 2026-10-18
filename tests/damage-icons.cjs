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
