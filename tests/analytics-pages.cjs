const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
// Every public page of app/ is counted by the statistics: an address missing from ANALYTICS_PATH was refused with
// 400 by POST /api/analytics (/avanzamento and /termini until 28 October 2026). New sections are checked too.
const {ANALYTICS_PATH}=require('../lib/analytics-events.ts');
/** Never counted: the reserved area, the API, and the personal pages the provider leaves out on purpose. */
const NOT_COUNTED=/^\/(admin|api|account|personaggi)(\/|$)/;
const pages=[];
(function walk(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())walk(full);
  else if(entry.name==='page.tsx'){
   // Route groups «(x)» leave no segment; a dynamic segment «[id]» becomes a plain example.
   const route='/'+path.relative('app',dir).split(path.sep).filter(part=>part&&!/^\(.*\)$/.test(part)).map(part=>/^\[.*\]$/.test(part)?'esempio-1':part).join('/');
   pages.push(route==='/.'?'/':route.replace(/^\/\.$/,'/'));
  }
 }
})('app');
const publicPages=pages.filter(route=>!NOT_COUNTED.test(route));
assert.ok(publicPages.length>=30,`public pages found: ${publicPages.length}`);
const missing=publicPages.filter(route=>!ANALYTICS_PATH.test(route));
assert.deepEqual(missing,[],'every public page is counted: add the missing ones to ANALYTICS_PATH (lib/analytics-events.ts)');
for(const route of ['/avanzamento','/termini','/info','/fonti','/privacy','/installa','/in-arrivo/bestiario','/segnala','/bestiario/proponi','/mostro/homebrew-guardiano-di-sale'])assert.ok(ANALYTICS_PATH.test(route),route);
for(const route of ['/admin','/admin/statistiche','/api/analytics','/account','/personaggi','/avanzamento/../admin','/termini?x=1'])assert.ok(!ANALYTICS_PATH.test(route),route);
console.log(`Statistics: all ${publicPages.length} public pages of app/ are counted; the reserved area, the API and the personal pages never.`);
