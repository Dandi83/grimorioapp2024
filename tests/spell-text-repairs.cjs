const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const ts=require('typescript');
function load(relative){
 const filename=path.resolve(relative),mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>id.startsWith('./')&&!id.endsWith('.json')?load(path.resolve(path.dirname(filename),id)+'.ts'):createRequire(filename)(id),mod,mod.exports);return mod.exports;
}
const {repairSpellText,spellTextRepairs}=load('lib/spell-text-repairs.ts');
const {getSrdSource}=load('lib/srd-descriptions.ts');
const {getLegacySpellSource}=load('lib/srd-spells-2014.ts');
const srd=new Map(require('../lib/data/srd-italiano-5.2.1.json').spells.map(s=>[s.id,s]));
const legacy=new Map(require('../lib/data/srd-spells-5.1-it.json').records.map(r=>[r.spell.id,r.spell]));
const HYPHEN=/[A-Za-zÀ-ÿ]{2,}-(?:\s*\n\s*[a-zà-ÿ]|(?=\s{2,}|\n))/;
const ids=Object.keys(spellTextRepairs.testi);
assert.deepEqual(ids.sort(),['confusione','evoca-folletto-2014','insetto-gigante','muro-prismatico','nube-mortale','parola-divina','semipiano','sembrare','spruzzo-prismatico','teletrasporto'].sort());
for(const id of ['controllare-tempo-atmosferico','scrutare','spostamento-planare','scrutare-2014'])assert.ok(!ids.includes(id),`${id} stays as it is`);
for(const id of ids){
 const damaged=(srd.get(id)||legacy.get(id)).descrizione;
 const fixed=repairSpellText(id,damaged);
 assert.notEqual(fixed,damaged,`${id}: the damaged text is repaired`);
 let expected=damaged;
 for(const {da,a} of spellTextRepairs.testi[id].sostituzioni){
  assert.equal(damaged.split(da).length,2,`${id}: "${da.slice(0,30)}" occurs once`);
  assert.ok(!fixed.includes(da)&&fixed.includes(a),`${id}: ${a.slice(0,30)}`);
  expected=expected.replace(da,()=>a);
 }
 assert.equal(fixed,expected,`${id}: nothing else changes`);
 assert.ok(!HYPHEN.test(fixed),`${id}: no word split by hyphenation left`);
 assert.equal(repairSpellText(id,fixed),fixed,`${id}: repairing twice changes nothing`);
 // A text edited in the reserved area is never overwritten, even if the damaged words are still there.
 const edited=damaged.replace(/\.(?=[^.]*$)/,'. Nota del master.');
 assert.equal(repairSpellText(id,edited),edited,`${id}: an edited text wins`);
 assert.equal(repairSpellText(id,''),'');
 // The repaired text keeps its source label.
 if(srd.has(id))assert.ok(getSrdSource(id,fixed),`${id}: SRD 5.2.1 label kept`);
 else assert.ok(getLegacySpellSource({...legacy.get(id),descrizione:fixed}),`${id}: SRD 5.1 label kept`);
}
assert.equal(repairSpellText('palla-di-fuoco',srd.get('confusione').descrizione),srd.get('confusione').descrizione,'only the approved IDs are repaired');
// Specific checks asked by Daniele.
assert.ok(repairSpellText('confusione',srd.get('confusione').descrizione).includes('entro la sua portata,\n      il bersaglio non effettua azioni.'));
assert.ok(repairSpellText('nube-mortale',srd.get('nube-mortale').descrizione).endsWith('superiore al 5º.'));
assert.ok(repairSpellText('evoca-folletto-2014',legacy.get('evoca-folletto-2014').descrizione).includes('Il folletto obbedisce ai comandi verbali'));
// Teleport table: one row "Visto occasionalmente", every row with its columns aligned.
const table=repairSpellText('teletrasporto',srd.get('teletrasporto').descrizione).match(/<pre>Risultato del teletrasporto([\s\S]*?)<\/pre>/)[1].split('\n');
assert.ok(table.includes('Visto occasionalmente  01–33    34–43     44–53       54–00'));
assert.ok(!table.some(line=>/sionalmente|occa-/.test(line.replace('occasionalmente',''))));
for(const line of table.filter(line=>/\d\d–\d\d/.test(line)))assert.equal(line.search(/\d\d–\d\d|—/),line.startsWith('Cerchio')||line.startsWith('Oggetto')?24:23,line);
console.log(`Spell text repairs: ${ids.length} texts repaired only while still damaged, source labels kept, no hyphenation left, teleport table aligned.`);
