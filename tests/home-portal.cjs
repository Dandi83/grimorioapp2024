const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{JSDOM}=require('jsdom'),ts=require('typescript');
const records=['srd-monsters-5.2.1-it.json','srd-animals-5.2.1-it.json','srd-monsters-5.1-it.json'].flatMap(file=>require('../lib/data/'+file).records.map(row=>row.monster));
let monsters=records;
function load(file){
 const filename=path.resolve(file),mod={exports:{}};
 new Function('require','module','exports',ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(id=>{
  if(id==='next/link')return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)};
  if(id==='next/image')return {__esModule:true,default:()=>null};
  if(id==='@/lib/monsters')return {getAllMonsters:async()=>monsters};
  if(id==='@/lib/spells')return {getAllSpells:async()=>[],computeMeta:()=>({scuole:[]}),levelLabel:n=>String(n)};
  if(id.endsWith('.module.css'))return {__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})};
  if(id.startsWith('@/')||id.startsWith('.')){
   const target=id.startsWith('@/')?path.resolve(id.slice(2)):path.resolve(path.dirname(filename),id);
   if(target.endsWith('.json'))return JSON.parse(fs.readFileSync(target,'utf8'));
   return load(['.ts','.tsx'].map(ext=>target+ext).find(fs.existsSync));
  }
  return require(id);
 },mod,mod.exports);return mod.exports;
}
const Home=load('app/page.tsx').default;
async function render(env){process.env.VERCEL_ENV=env;return new JSDOM(renderToStaticMarkup(await Home())).window.document;}
(async()=>{
 const before=process.env.VERCEL_ENV;
 try{
  let doc=await render('production');
  assert.equal(doc.querySelectorAll('h1').length,1);
  const links=[...doc.querySelectorAll('a')].map(a=>a.getAttribute('href'));
  assert.ok(!links.some(href=>href.startsWith('/grimorio')),'Home must not duplicate spell navigation');
  for(const href of ['/bestiario','/bestiario?raccolta=mostri','/bestiario?raccolta=animali','/preferiti','/fonti','/admin'])assert.ok(links.includes(href),href);
  assert.ok(doc.body.textContent.includes('240 mostri'));assert.ok(doc.body.textContent.includes('100 animali'));
  assert.ok(!links.includes('/manuale'));assert.ok(!links.includes('/personaggi'));
  assert.ok(doc.body.textContent.includes('Nessuna affiliazione'));
  monsters=[...records,{id:'creatura-aggiunta'}];
  doc=await render('production');assert.ok(doc.body.textContent.includes('241 mostri'),'Counts reflect catalog additions');
  doc=await render('preview');assert.ok(doc.querySelector('a[href="/manuale"]'));assert.ok(doc.querySelector('a[href="/personaggi"]'));
  console.log('Portal Home: no spell shortcuts, live catalog counts, Bestiario/animal/favorite links, protected admin entry and preview-only sections passed.');
 }finally{if(before===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=before;}
})().catch(error=>{console.error(error);process.exitCode=1});
