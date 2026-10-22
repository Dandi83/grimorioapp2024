const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const {createRequire}=require('node:module');

const ORIGIN='https://ilgrimorio.app';
function worker({version='v2',caches:shared}={}){
 const listeners={};
 const store=shared||new Map();
 const cacheFor=name=>{if(!store.has(name))store.set(name,new Map());const entries=store.get(name);return {
  async match(request){const r=entries.get(typeof request==='string'?new URL(request,ORIGIN).href:request.url??new URL(request.href).href);return r?r.clone():undefined;},
  async put(request,response){entries.set(typeof request==='string'?new URL(request,ORIGIN).href:request.url??request.href,response.clone());},
  async keys(){return [...entries.keys()].map(url=>({url}));},
  async delete(key){return entries.delete(key.url??new URL(key,ORIGIN).href);},
 };};
 const network={online:true,slow:false,calls:[],pages:{},cacheModes:[]};
 const fetchMock=async(input)=>{
  const url=new URL(typeof input==='string'?input:input.url,ORIGIN);network.calls.push(url.pathname);
  if(!network.online)throw new TypeError('Failed to fetch');
  if(network.slow)return new Promise(()=>{});
  const body=network.pages[url.pathname]??`contenuto ${url.pathname}`;
  const response=new Response(body,{status:url.pathname.includes('manca')?404:200,headers:{'Content-Type':'text/html'}});
  Object.defineProperty(response,'type',{value:'basic'});return response;
 };
 const self={location:new URL(ORIGIN+'/sw.js'),addEventListener:(type,fn)=>{listeners[type]=fn;},skipWaiting:async()=>{},
  clients:{claim:async()=>{}},registration:{}};
 const context=vm.createContext({self,caches:{open:async name=>cacheFor(name),keys:async()=>[...store.keys()],delete:async name=>store.delete(name)},
  fetch:fetchMock,Request:function(request,init){network.cacheModes.push(init&&init.cache);return Object.assign(Object.create(request),{url:request.url,cache:init&&init.cache});},Response,Headers,URL,Map,Promise,Number,String,Array,Math,Date,console,
  setTimeout:(fn,ms,...args)=>setTimeout(fn,ms>=3000?20:ms,...args)});
 vm.runInContext(`const VERSION=${JSON.stringify(version)};\n`+fs.readFileSync('lib/sw/service-worker.js','utf8'),context);
 const lifecycle=async type=>{let done;listeners[type]({waitUntil:p=>{done=p;}});await done;};
 const request=(pathname,{mode='navigate',method='GET',headers={}}={})=>({url:ORIGIN+pathname,method,mode,headers:new Headers(headers)});
 let clientCounter=0;
 const fetchEvent=async(req)=>{
  let responded,waits=[];const resultingClientId=`client-${++clientCounter}`;
  listeners.fetch({request:req,resultingClientId,respondWith:p=>{responded=p;},waitUntil:p=>waits.push(p)});
  const response=responded?await responded:undefined;await Promise.all(waits);return {response,resultingClientId};
 };
 const fetchEventRaw=(req,respondWith)=>listeners.fetch({request:req,resultingClientId:'slow',respondWith,waitUntil(){}});
 const ask=pathname=>new Promise(resolve=>listeners.message({data:{type:'saved-copy?',path:pathname},source:{id:'c'},ports:[{postMessage:resolve}]}));
 const message=async data=>{let done;listeners.message({data,source:{id:'x'},ports:[],waitUntil:p=>{done=p;}});await done;};
 return {store,network,lifecycle,request,fetchEvent,fetchEventRaw,ask,message};
}
const text=r=>r.text();

(async()=>{
 const sw=worker();
 // Install saves the five main sections; activate keeps only this version's pages.
 sw.store.set('grimorio-pages-v1',new Map());sw.store.set('grimorio-static',new Map([['https://ilgrimorio.app/_next/static/old.js',new Response('old')]]));
 await sw.lifecycle('install');
 assert.deepEqual([...sw.store.get('grimorio-pages-v2').keys()].sort(),['/','/bestiario','/compendio','/grimorio','/preferiti','/ricerca-indice.json'].map(p=>ORIGIN+p).sort());
 await sw.lifecycle('activate');
 assert.equal(sw.store.has('grimorio-pages-v1'),false,'pages of the previous version are deleted');
 assert.equal(sw.store.has('grimorio-static'),true,'program files survive a new version (older pages may still need them)');

 // Online: always the network, and the fresh page is saved.
 sw.network.pages['/spell/scudo']='Scudo versione nuova';
 let {response,resultingClientId}=await sw.fetchEvent(sw.request('/spell/scudo'));
 assert.equal(await text(response),'Scudo versione nuova');
 assert.equal((await sw.ask('/spell/scudo')).savedAt,null,'no notice when the page came from the network');
 assert.ok(sw.network.cacheModes.length>0&&sw.network.cacheModes.every(mode=>mode==='no-cache'),'pages never come from the browser HTTP cache');
 sw.network.pages['/spell/scudo']='Scudo aggiornato';
 ({response}=await sw.fetchEvent(sw.request('/spell/scudo')));
 assert.equal(await text(response),'Scudo aggiornato','online, a changed page is never served from the saved copy');

 // Offline: the saved copy, and the page is told so it can show the notice.
 sw.network.online=false;
 ({response,resultingClientId}=await sw.fetchEvent(sw.request('/spell/scudo')));
 assert.equal(await text(response),'Scudo aggiornato');
 const {savedAt}=await sw.ask('/spell/scudo');
 assert.ok(savedAt>Date.now()-60000,'the saved date is reported to the page');
 assert.equal((await sw.ask('/spell/scudo')).savedAt,null,'the notice is reported once');
 // The saved date also travels inside the page, in case the worker is stopped before the page asks.
 sw.network.online=true;sw.network.pages['/spell/palla-di-fuoco']='<!DOCTYPE html><html><head><title>Palla</title></head><body>x</body></html>';
 await sw.fetchEvent(sw.request('/spell/palla-di-fuoco'));
 sw.network.online=false;
 ({response}=await sw.fetchEvent(sw.request('/spell/palla-di-fuoco')));
 const markedHtml=await text(response);
 assert.match(markedHtml,/^<!DOCTYPE html><html><head><meta name="grimorio-saved-at" content="\d+"><title>Palla<\/title>/,'saved pages carry their date');
 assert.equal(response.headers.get('Content-Length'),null);
 ({response}=await sw.fetchEvent(sw.request('/spell/mai-aperta')));
 assert.equal(response.status,503);assert.match(await text(response),/Sei offline/,'pages never opened show the offline notice');
 // Slow network: after the timeout the saved copy is shown, and the network answer still refreshes it.
 sw.network.online=true;sw.network.slow=true;
 const slowEvent=sw.request('/grimorio');let slowResponded;
 const slowListenerResult=new Promise(resolve=>{sw.fetchEventRaw(slowEvent,p=>{slowResponded=p;resolve();});});
 await slowListenerResult;
 response=await Promise.race([slowResponded,new Promise((_,reject)=>setTimeout(()=>reject(new Error('no timeout fallback')),2000))]);
 assert.equal(await text(response),'contenuto /grimorio','a slow network shows the saved copy after the timeout');
 sw.network.slow=false;

 // The report form opens offline (sending needs the network); its address ignores the page it is about.
 sw.network.pages['/segnala']='Modulo segnala';
 await sw.fetchEvent(sw.request('/segnala?pagina=/spell/scudo'));
 sw.network.online=false;
 ({response}=await sw.fetchEvent(sw.request('/segnala?pagina=/mostro/lich&edizione=2014')));
 assert.equal(await text(response),'Modulo segnala','the saved form opens offline from any card');
 sw.network.online=true;

 // Never handled: admin, characters, account, API, Server Actions, RSC data, other sites, unsaved 404s.
 sw.network.online=true;
 for(const req of [sw.request('/admin'),sw.request('/admin/statistiche'),sw.request('/admin/segnalazioni'),sw.request('/admin/segnalazioni/11111111-1111-4111-8111-111111111111'),
  sw.request('/api/segnalazioni',{mode:'cors'}),sw.request('/api/segnalazioni',{method:'POST',mode:'cors'}),sw.request('/personaggi'),sw.request('/account'),sw.request('/manuale'),
  sw.request('/api/analytics',{mode:'cors'}),sw.request('/spell/scudo',{method:'POST'}),sw.request('/spell/scudo',{mode:'cors',headers:{RSC:'1'}}),
  sw.request('/grimorio?_rsc=abc',{mode:'cors'}),{url:'https://example.com/',method:'GET',mode:'navigate',headers:new Headers()}]){
  assert.equal((await sw.fetchEvent(req)).response,undefined,`${req.method} ${req.url} goes straight to the network`);
 }
 ({response}=await sw.fetchEvent(sw.request('/manca-pagina')));
 assert.equal(response,undefined);
 ({response}=await sw.fetchEvent(sw.request('/spell/manca',{})));
 assert.equal(sw.store.get('grimorio-pages-v2').has(ORIGIN+'/spell/manca'),false,'error pages are not saved');

 // Program files: from the phone once saved, also offline.
 ({response}=await sw.fetchEvent(sw.request('/_next/static/chunks/app.js',{mode:'no-cors'})));
 assert.equal(await text(response),'contenuto /_next/static/chunks/app.js');
 sw.network.online=false;
 ({response}=await sw.fetchEvent(sw.request('/_next/static/chunks/app.js',{mode:'no-cors'})));
 assert.equal(await text(response),'contenuto /_next/static/chunks/app.js');
 // Files of the first page are saved on request, only same-site program files.
 sw.network.online=true;
 await sw.message({type:'cache-files',urls:[ORIGIN+'/_next/static/css/a.css','https://example.com/x.js',ORIGIN+'/api/analytics']});
 const statics=[...sw.store.get('grimorio-static').keys()];
 assert.ok(statics.includes(ORIGIN+'/_next/static/css/a.css'));
 assert.ok(!statics.some(u=>u.includes('example.com')||u.includes('/api/')));

 // Hidden sections (/admin/sezioni): their saved copies are deleted and never shown, also after a restart.
 sw.network.online=true;
 for(const p of ['/classi','/classi/mago','/compendio/condizioni','/manuale/condizioni-accecato'])await sw.fetchEvent(sw.request(p));
 const pages=()=>[...sw.store.get('grimorio-pages-v2').keys()].map(u=>new URL(u).pathname);
 assert.ok(pages().includes('/classi/mago'));
 await sw.message({type:'hidden-sections',paths:['/classi','/compendio/condizioni','/manuale/condizioni-']});
 assert.deepEqual(pages().filter(p=>/classi|condizioni/.test(p)),[],'saved copies of hidden sections are deleted');
 assert.ok(pages().includes('/spell/scudo'),'the other saved pages stay');
 ({response}=await sw.fetchEvent(sw.request('/classi')));
 assert.equal(response.status,200);assert.ok(!pages().includes('/classi'),'online, a hidden page is not saved again');
 sw.network.online=false;
 ({response}=await sw.fetchEvent(sw.request('/classi')));
 assert.equal(response.status,503,'offline, a hidden page shows the offline notice, never a saved copy');
 const restarted=worker({caches:sw.store});
 restarted.store.get('grimorio-pages-v2').set(ORIGIN+'/classi/mago',new Response('copia vecchia',{headers:{'Content-Type':'text/html'}}));
 restarted.network.online=false;
 ({response}=await restarted.fetchEvent(restarted.request('/classi/mago')));
 assert.equal(response.status,503,'the hidden list survives a stopped worker');
 // A page answered 404 online (hidden while the phone did not know yet) loses its saved copy.
 restarted.network.online=true;
 restarted.store.get('grimorio-pages-v2').set(ORIGIN+'/oggetti-magici/manca-ali',new Response('copia vecchia'));
 await restarted.fetchEvent(restarted.request('/oggetti-magici/manca-ali'));
 assert.equal(restarted.store.get('grimorio-pages-v2').has(ORIGIN+'/oggetti-magici/manca-ali'),false,'a 404 deletes the saved copy');
 await restarted.message({type:'hidden-sections',paths:[]});
 await restarted.fetchEvent(restarted.request('/classi'));
 assert.ok(restarted.store.get('grimorio-pages-v2').has(ORIGIN+'/classi'),'shown again: saved again');

 // Hidden parts (an edition, a block): the copies saved before a change of the parts are deleted, once.
 restarted.network.online=true;
 for(const p of ['/avanzamento','/oggetti-magici/ali-del-volo','/spell/scudo'])await restarted.fetchEvent(restarted.request(p));
 const saved=()=>[...restarted.store.get('grimorio-pages-v2').keys()].map(u=>new URL(u).pathname);
 await restarted.message({type:'hidden-sections',paths:[],parts:[{path:'/avanzamento',signature:'avanzamento:calcolatore'}]});
 assert.ok(!saved().includes('/avanzamento')&&saved().includes('/spell/scudo'),'a section whose parts change loses its saved copies');
 await restarted.fetchEvent(restarted.request('/avanzamento'));
 await restarted.message({type:'hidden-sections',paths:[],parts:[{path:'/avanzamento',signature:'avanzamento:calcolatore'}]});
 assert.ok(saved().includes('/avanzamento'),'same parts: the copy saved after the change stays');
 await restarted.message({type:'hidden-sections',paths:[],parts:[]});
 assert.ok(!saved().includes('/avanzamento'),'parts shown again: the copy without them is deleted too');

 // The route serves this worker with its version, or the self-removing one when switched off.
 const routeFile=path.resolve('app/sw.js/route.ts');
 const loadRoute=()=>{const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(routeFile,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(id=>id==='@/lib/service-worker-config'?{serviceWorkerEnabled:()=>process.env.GRIMORIO_SERVICE_WORKER!=='off'}:createRequire(routeFile)(id),mod,mod.exports);return mod.exports;};
 process.env.VERCEL_GIT_COMMIT_SHA='abc123';
 let routeResponse=loadRoute().GET();
 assert.equal(routeResponse.headers.get('cache-control'),'no-cache, no-store, must-revalidate');
 assert.match(await routeResponse.text(),/^const VERSION = "abc123";\n/);
 process.env.GRIMORIO_SERVICE_WORKER='off';
 routeResponse=loadRoute().GET();
 const killer=await routeResponse.text();
 assert.match(killer,/unregister\(\)/);assert.doesNotMatch(killer,/respondWith/,'switched off: no request is handled any more');
 delete process.env.GRIMORIO_SERVICE_WORKER;delete process.env.VERCEL_GIT_COMMIT_SHA;
 // The self-removing worker deletes every saved copy and unregisters.
 const store=new Map([['grimorio-pages-x',new Map()],['grimorio-static',new Map()],['altro',new Map()]]);
 const listeners={};let unregistered=false,reloaded=[];
 vm.runInContext(killer,vm.createContext({self:{addEventListener:(t,f)=>{listeners[t]=f;},skipWaiting(){},registration:{unregister:async()=>{unregistered=true;}},
  clients:{matchAll:async()=>[{url:'/grimorio',navigate:u=>reloaded.push(u)}]}},caches:{keys:async()=>[...store.keys()],delete:async k=>store.delete(k)}}));
 let done;listeners.activate({waitUntil:p=>{done=p;}});await done;
 assert.deepEqual([...store.keys()],['altro']);assert.ok(unregistered);assert.deepEqual(reloaded,['/grimorio']);

 console.log('Service worker: network-first pages with saved copy offline or after 3 s, notice once, offline page, admin/API/RSC/actions untouched, program files cached, versioned cleanup, emergency switch, hidden sections never served from a saved copy, copies dropped when hidden parts change.');
})().catch(error=>{console.error(error);process.exit(1);});
