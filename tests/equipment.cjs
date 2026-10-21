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
// Armor: 13 entries per edition, same numbers, names per edition, cross-checked with the request.
const ar=load('lib/armor.ts');
const armorData=JSON.parse(fs.readFileSync('lib/data/srd-armor-it.json','utf8'));
assert.equal(ar.armors.length,13);
assert.equal(new Set(ar.armors.map(a=>a.id)).size,13);
assert.equal(ar.sameNumbers,true);
const CATEGORY={leggera:0,media:1,pesante:2,scudo:3};
const armorLines=fs.readFileSync('tests/fixtures/equipment-armor-request.txt','utf8').trim().split('\n');
armorLines.forEach((line,i)=>{
 const [names,categoria,ca,forza,furtivita,peso,costo]=line.split(' | ');
 const [n2014,n2024=n2014]=names.split(' / ');
 const a=ar.armors[i];
 assert.equal(a.editions['2014'].nome,n2014);assert.equal(a.editions['2024'].nome,n2024);assert.equal(a.categoria,CATEGORY[categoria],n2014);
 for(const e of ['2014','2024']){const v=a.editions[e];
  assert.equal(v.caTesto.replace('modificatore di ',''),ca,n2014);assert.equal(v.forza?`For ${v.forza}`:'—',forza,n2014);
  assert.equal(v.furtivitaSvantaggio,furtivita==='Svantaggio',n2014);assert.equal(v.peso,peso,n2014);assert.equal(v.costo,costo,n2014);}
});
assert.deepEqual(ar.armorTimes['2014'],['Indossare 1 minuto · togliere 1 minuto','Indossare 5 minuti · togliere 1 minuto','Indossare 10 minuti · togliere 5 minuti','Indossare 1 azione · togliere 1 azione']);
// PDF 2024: the shield takes the Utilize action, not "1 azione" as in 2014.
assert.equal(ar.armorTimes['2024'][3],'Indossare o togliere: azione di Utilizzo');
assert.deepEqual(ar.armorBadge(ar.getArmor('cotta-di-maglia').editions['2024']),{ca:'16',caNote:[],chips:[{kind:'strength',label:'For 13'},{kind:'stealth',label:'Furtività: svantaggio'}]});
assert.deepEqual(ar.armorBadge(ar.getArmor('cuoio').editions['2014']),{ca:'11',caNote:['+ Des'],chips:[]});
assert.deepEqual(ar.armorBadge(ar.getArmor('pelle').editions['2014']),{ca:'12',caNote:['+ Des','max 2'],chips:[]});
assert.deepEqual(ar.armorBadge(ar.getArmor('scudo').editions['2024']),{ca:'+2',caNote:[],chips:[]});
assert.equal(ar.armorClassRest(ar.getArmor('pelle').editions['2024']),'+ modificatore di Destrezza (max 2)');
assert.equal(ar.armorClassRest(ar.getArmor('cotta-di-maglia').editions['2014']),undefined);
assert.equal(ar.armorClassRest(ar.getArmor('scudo').editions['2014']),undefined);
// No repetition: chips never restate the badge, and on the sheet each fact has one place.
for(const item of ar.armorListItems())for(const e of ['2014','2024']){const v=item.editions[e];
 const said=[...v.caNote,...v.chips.map(c=>c.label)];
 assert.equal(new Set(said).size,said.length,`${e} ${item.id} repeated label`);
 assert.ok(v.chips.every(c=>!/Des|max|CA|competenza/i.test(c.label)),`${e} ${item.id} chip repeats the badge`);}
for(const a of ar.armors)for(const e of ['2014','2024']){const v=a.editions[e];const cards=ar.armorRuleCards(v,a.categoria);
 const titles=cards.map(c=>c.title),details=cards.map(c=>c.detail).filter(Boolean);
 assert.equal(new Set(titles).size,titles.length,`${e} ${a.id} card twice`);
 assert.equal(new Set(details).size,details.length,`${e} ${a.id} detail twice`);
 assert.ok(!details.some(d=>d.includes(v.caTesto)),`${e} ${a.id} the AC is written only under the badge`);
 assert.equal(details.filter(d=>/^Indossare/.test(d)).length,1,`${e} ${a.id} times once`);}
for(const a of ar.armors)for(const e of ['2014','2024']){const v=a.editions[e];const cards=ar.armorRuleCards(v,a.categoria);
 assert.ok(cards.length>=4&&cards.every(c=>c.text.length>30),`${e} ${a.id}`);
 assert.equal(cards.some(c=>c.title==='Forza'),!!v.forza);assert.equal(cards.some(c=>c.title==='Furtività'),v.furtivitaSvantaggio);
 if(e==='2014'&&a.categoria<3)assert.ok(ar.armorDescription(v).testo.length>60,a.id);}
assert.ok(ar.armorRuleCards(ar.getArmor('cuoio').editions['2024'],0).find(c=>c.title==='Classe Armatura (CA)').text.startsWith('La colonna Classe Armatura della tabella'));
assert.ok(!JSON.stringify(ar.armorListItems()).includes(armorData.regole2014.generali['Furtività'].testo.slice(0,30)));
console.log(`Armor: 13 entries per edition with the same numbers, ${armorLines.length} rows cross-checked, times per edition, rule cards for every sheet.`);
console.log(`Equipment: 37 weapons 2014 and 38 2024, ${checked} rows cross-checked with the request, 8 changes computed, texts for every property and mastery, offline pages.`);
