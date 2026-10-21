const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const ts=require('typescript');
function load(relative){
 const filename=path.resolve(relative),mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,resolveJsonModule:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id.startsWith('@/')||id.startsWith('./')){
   const file=id.startsWith('@/')?path.resolve(id.slice(2)):path.resolve(path.dirname(filename),id);
   if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
   for(const extension of ['.ts','.tsx'])if(fs.existsSync(file+extension))return load(file+extension);
  }
  return createRequire(filename)(id);
 },mod,mod.exports);return mod.exports;
}
const eq=load('lib/equipment.ts');
const data=JSON.parse(fs.readFileSync('lib/data/srd-weapons-it.json','utf8'));

// Counts and no duplicates (Stocco and Tridente are printed twice in the 2024 PDF).
const inEdition=e=>eq.weapons.filter(w=>w.editions[e]);
assert.equal(inEdition('2014').length,37);
assert.equal(inEdition('2024').length,38);
assert.equal(new Set(eq.weapons.map(w=>w.id)).size,eq.weapons.length);
for(const e of ['2014','2024'])assert.equal(new Set(inEdition(e).map(w=>w.editions[e].nome)).size,inEdition(e).length,e+' names');
assert.deepEqual(data.righeDoppieNelPdf2024,['Stocco','Tridente']);
assert.equal(eq.getWeapon('rete').editions['2024'],undefined);
assert.equal(eq.getWeapon('moschetto').editions['2014'],undefined);

// Cross-check with the table in the request; the PDF wins and the only differences are written here.
const norm=s=>s.toLowerCase().replace(/gittata /g,'').replace(/\s+/g,' ').trim();
let edition,checked=0;
for(const line of fs.readFileSync('tests/fixtures/equipment-weapons-request.txt','utf8').trim().split('\n')){
 if(/^20[12]4$/.test(line)){edition=line;continue;}
 const cells=line.split(' | ');
 const [nome,costo,danno,peso,proprieta,padronanza]=edition==='2014'?[cells[0],cells[2],cells[3],cells[4],cells[5]]:cells;
 const w=eq.weapons.find(x=>x.editions[edition]?.nome===nome);assert.ok(w,edition+' '+nome);
 const v=w.editions[edition];
 assert.equal(v.costo,costo,nome);assert.equal(v.peso,peso,nome);
 assert.equal(danno==='—'?'':danno,`${v.danni} ${v.tipoDanno}`.trim(),nome);
 assert.equal(norm(v.proprietaTesto||'—'),norm(proprieta),nome);
 if(edition==='2014')assert.equal(w.gruppo,Number(cells[1]),nome);
 // PDF: "Colpo di Striscio" in the Falcione row, shown with the heading of the mastery.
 if(padronanza)assert.equal(v.padronanza,padronanza,nome);
 checked++;
}
assert.equal(checked,75);
assert.equal(data.armi.find(a=>a.id==='falcione')['2024'].padronanza,'Colpo di Striscio');

// Changes between editions come from the data.
assert.deepEqual(eq.weapons.filter(w=>eq.compareWeapon(w).changed).map(w=>w.id).sort(),
 ['cerbottana','lancia-da-cavaliere','martello-da-guerra','moschetto','piccone-da-guerra','pistola','rete','tridente']);
assert.equal(eq.compareWeapon(eq.getWeapon('rete')).note,'Non presente nella tabella 2024');
assert.equal(eq.compareWeapon(eq.getWeapon('pistola')).note,'Nuova nel 2024');
assert.equal(eq.compareWeapon(eq.getWeapon('spada-lunga')).rows.length,0);

// Every property and mastery has its text in both editions; 2014 special weapons have their rule.
for(const w of eq.weapons)for(const e of ['2014','2024']){const v=w.editions[e];if(!v)continue;
 for(const card of eq.propertyCards(v))assert.ok(card.text.length>40,`${e} ${w.id} ${card.label}`);
 if(v.padronanza)assert.ok(eq.masteryText(v.padronanza),v.padronanza);}
for(const id of ['lancia-da-cavaliere','rete'])assert.ok(eq.specialRule(eq.getWeapon(id).editions['2014']).length>80,id);
assert.equal(eq.specialRule(eq.getWeapon('lancia-da-cavaliere').editions['2024']),undefined);
assert.ok(eq.propertyText('2014','pesante')!==eq.propertyText('2024','pesante'),'Pesante per edition');

// List payload: no rule texts.
const items=JSON.stringify(eq.weaponListItems());
assert.ok(items.length<20000,'list payload '+items.length);
assert.ok(!items.includes(eq.propertyText('2014','pesante').slice(0,30)));

// Offline: the service worker saves the section pages.
const sw=fs.readFileSync('lib/sw/service-worker.js','utf8');
const pattern=new RegExp(sw.match(/const PUBLIC_PAGE = (\/.*\/);/)[1].slice(1,-1));
for(const p of ['/compendio','/equipaggiamento','/equipaggiamento/armi','/equipaggiamento/armi/pugnale','/equipaggiamento/armature','/equipaggiamento/armature/cotta-di-maglia'])assert.ok(pattern.test(p),p);
assert.ok(!pattern.test('/equipaggiamento/altro'));
console.log(`Equipment: 37 weapons 2014 and 38 2024, ${checked} rows cross-checked with the request, 8 changes computed, texts for every property and mastery, offline pages.`);
