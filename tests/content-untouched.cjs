// «Modifica tutto»: a card saved without touching a field must not create a correction for it.
// The save keeps a field only when its cleaned value differs from the value shown, so every
// printed value must come back identical after the cleanup, also with the browser's CR LF.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const ts=require('typescript');
const cache=new Map();
function load(relative){
 const filename=path.resolve(relative);
 if(cache.has(filename))return cache.get(filename).exports;
 const mod={exports:{}};cache.set(filename,mod);
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='server-only')return {};
  if(id.startsWith('@/')||id.startsWith('./')||id.startsWith('../')){
   const file=id.startsWith('@/')?path.resolve(id.slice(2)):path.resolve(path.dirname(filename),id);
   if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
   if(fs.existsSync(file+'.ts'))return load(file+'.ts');
  }
  return createRequire(filename)(id);
 },mod,mod.exports);return mod.exports;
}
const {normalizeValue}=load('lib/content-validate.ts');
const {CONTENT_SECTIONS,cardFields}=load('lib/content-sections.ts');
let checked=0;const changed=[];
for(const section of CONTENT_SECTIONS)for(const edition of section.editions)for(const item of section.items(edition)){
 const original=section.original(item.id,edition);
 assert.ok(original,`${section.key}/${item.id}/${edition} has its printed values`);
 for(const field of cardFields(section,original,item.id,edition)){
  const value=String(original[field.name]??'');
  checked++;
  for(const sent of [value,value.replace(/\n/g,'\r\n')]){
   if(normalizeValue(field.kind,sent)!==value)changed.push(`${section.key}/${item.id}/${edition}/${field.name}`);
  }
 }
}
assert.ok(checked>1000,`only ${checked} fields checked`);
assert.deepEqual(changed,[],'untouched fields would be saved as corrections');
console.log(`Modifica tutto: ${checked} fields in ${CONTENT_SECTIONS.length} sections come back identical when the card is saved untouched.`);
