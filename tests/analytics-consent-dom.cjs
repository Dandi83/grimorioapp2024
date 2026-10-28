const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),{createRequire}=require('node:module');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><article class="monster-sheet"></article><div id="root"></div><div id="probe"></div>',{url:'https://ilgrimorio.app/mostro/gatto?analytics_test=1&ref=share'});
for(const key of ['window','document','HTMLElement','Event','MouseEvent','CustomEvent','sessionStorage'])global[key]=dom.window[key];
Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
const article=document.querySelector('article');article.getBoundingClientRect=()=>({height:1000,top:0});
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client');
let interval,now=Date.now(),currentPath='/mostro/gatto';const originalNow=Date.now;Date.now=()=>now;
window.setInterval=callback=>{interval=callback;return 1};
// The server: the saved answer of this browser (null = the bar not answered yet).
let saved=null;const requests=[];
global.fetch=async(url,options={})=>{const body=options.body?JSON.parse(options.body):null;requests.push({url,body});if(body?.consent)saved=body.consent;return {ok:true,json:async()=>body?.consent?{ok:true,consent:body.consent}:{enabled:true,excluded:false,consent:saved}}};
// «La tua edizione»: the welcome screen of the first visit, then the edition chosen.
let edition={ready:true,firstLaunch:true};
const notice=require(path.resolve('components/statistics/notice.ts'));
const file=path.resolve('components/analytics-provider.tsx'),mod={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(id=>id==='next/navigation'?{usePathname:()=>currentPath}:id==='next/link'?{__esModule:true,default:({children,prefetch,...props})=>React.createElement('a',props,children)}:id==='@/components/edition/edition-provider'?{useUserEdition:()=>edition}:id==='@/components/statistics/notice'?notice:createRequire(file)(id),mod,mod.exports);
const events=()=>requests.filter(r=>r.body?.event).map(r=>r.body);
const bar=()=>document.querySelector('[data-statistics-bar]');
const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent===text);
const click=async text=>act(async()=>{assert.ok(button(text),text);button(text).dispatchEvent(new MouseEvent('click',{bubbles:true}))});
// What the invite to install the app reads (components/install-prompt.tsx).
let noticeValue;const Probe=()=>{noticeValue=notice.useStatisticsNotice();return null};
const probe=createRoot(document.getElementById('probe'));
(async()=>{
 await act(async()=>probe.render(React.createElement(Probe)));
 let root=createRoot(document.getElementById('root'));
 const render=async()=>act(async()=>root.render(React.createElement(mod.exports.AnalyticsProvider)));
 // Counted at once, before any answer; the bar never over the welcome screen, the invite held back meanwhile.
 await render();
 assert.deepEqual(events().map(e=>e.event),['page_view','card_open'],'counted from the first page, without waiting');
 assert.ok(events().every(e=>e.test===true&&e.source==='share'));
 assert.equal(bar(),null,'no bar over the welcome screen');assert.equal(noticeValue,'open','the invite waits');
 edition={ready:true,firstLaunch:false};await render();
 assert.ok(bar(),'the bar after the choice of the edition');
 assert.equal(bar().textContent.replace(/\s+/g,' ').trim(),'Statistiche anonime? InfoNoOk');
 assert.equal(bar().querySelector('a').getAttribute('href'),'/privacy');
 assert.ok(document.documentElement.hasAttribute('data-statistics-room'),'the page keeps room for the bar');
 // «Ok»: the bar closes, the counting goes on, the invite may come.
 await click('Ok');
 assert.equal(bar(),null);assert.equal(saved,'accepted');assert.equal(noticeValue,'closed');
 assert.ok(!document.documentElement.hasAttribute('data-statistics-room'));
 await act(async()=>window.dispatchEvent(new CustomEvent('grimorio:analytics-event',{detail:{event:'share_copy'}})));
 assert.equal(events().at(-1).event,'share_copy','«Ok» keeps counting');
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
 await act(async()=>{for(let i=0;i<30;i++){now+=1000;interval();}});assert.equal(events().filter(e=>e.event==='card_read').length,0,'background tabs never qualify as a read');
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));
 await act(async()=>{for(let i=0;i<25;i++){now+=1000;interval();}});
 assert.equal(events().filter(e=>e.event==='card_read').length,1,'a read is emitted only once per opening');
 // The switch of /privacy turned off: nothing more, at once.
 await act(async()=>{await mod.exports.saveStatisticsChoice('rejected');});
 const count=events().length;
 await act(async()=>window.dispatchEvent(new CustomEvent('grimorio:analytics-event',{detail:{event:'share_click'}})));
 assert.equal(events().length,count,'turned off: no new event');assert.equal(sessionStorage.length,0);
 assert.equal(bar(),null,'the bar does not come back');
 // And on again.
 await act(async()=>{await mod.exports.saveStatisticsChoice('accepted');});
 await act(async()=>window.dispatchEvent(new CustomEvent('grimorio:analytics-event',{detail:{event:'share_click'}})));
 assert.equal(events().at(-1).event,'share_click','turned on again: counted');
 await act(async()=>root.unmount());
 // A new browser pressing «No»: the bar closes and nothing is sent after it.
 saved=null;requests.length=0;sessionStorage.clear();root=createRoot(document.getElementById('root'));
 await render();
 assert.ok(bar());assert.equal(noticeValue,'open');
 await click('No');
 assert.equal(bar(),null);assert.equal(saved,'rejected');assert.equal(noticeValue,'closed');
 const afterNo=events().length;
 await act(async()=>window.dispatchEvent(new CustomEvent('grimorio:analytics-event',{detail:{event:'share_click'}})));
 await act(async()=>{for(let i=0;i<25;i++){now+=1000;interval();}});
 assert.equal(events().length,afterNo,'after «No» no event');
 await act(async()=>root.unmount());
 // Refused before (or «No» in an earlier visit): no event at all, no bar, nothing held back.
 requests.length=0;root=createRoot(document.getElementById('root'));
 await render();
 assert.equal(events().length,0);assert.equal(bar(),null);assert.equal(noticeValue,'closed');
 await act(async()=>root.unmount());await act(async()=>probe.unmount());
 Date.now=originalNow;
 console.log('Analytics UI: counted before any answer, bar after the welcome screen, «Ok» closes and counts, «No» and the switch stop at once, refusals kept, single read and share events passed.');
})().catch(error=>{Date.now=originalNow;console.error(error);process.exitCode=1});
