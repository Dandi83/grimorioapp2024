const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://ilgrimorio.app/'});
for(const key of ['window','document','HTMLElement','Event','MouseEvent','localStorage','FormData','HTMLFormElement','SubmitEvent'])Object.defineProperty(global,key,{value:dom.window[key],configurable:true,writable:true});
Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true});
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client'),ts=require('typescript');
const calls=[];let pathname='/';
const router={back:()=>calls.push('back'),prefetch:href=>calls.push(`prefetch:${href}`),push:href=>calls.push(`push:${href}`)};
const cache=new Map();
function load(relative){
 const filename=path.resolve(relative);
 if(cache.has(filename))return cache.get(filename).exports;
 const mod={exports:{}};cache.set(filename,mod);
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='next/navigation')return {useRouter:()=>router,usePathname:()=>pathname};
  if(id==='next/link')return {__esModule:true,default:({children,prefetch,...props})=>React.createElement('a',props,children)};
  if(id.startsWith('@/')){const file=path.resolve(id.slice(2));return load(['.ts','.tsx'].map(e=>file+e).find(fs.existsSync));}
  return createRequire(filename)(id);
 },mod,mod.exports);return mod.exports;
}
const root=createRoot(document.getElementById('root'));
const render=async element=>act(async()=>root.render(element));
const setUserAgent=ua=>Object.defineProperty(window.navigator,'userAgent',{value:ua,configurable:true});

(async()=>{
 // Back button: a card opened from a shared link (no previous page of the site) goes to its list.
 const {BackButton}=load('components/back-button.tsx');
 const {BottomNav}=load('components/bottom-nav.tsx');
 const clickBack=()=>act(async()=>document.querySelector('button[aria-label="Torna indietro"]').dispatchEvent(new MouseEvent('click',{bubbles:true})));
 window.requestIdleCallback=cb=>{cb();return 1};window.cancelIdleCallback=()=>{};
 const page=(path,fallback)=>{pathname=path;return React.createElement(React.Fragment,null,React.createElement(BottomNav),React.createElement(BackButton,{fallback}));};
 await render(page('/spell/dardo-incantato','/grimorio'));calls.length=0;
 await clickBack();
 assert.deepEqual(calls,['push:/grimorio'],'a shared link without site history goes to the spell list');
 // After moving inside the site, the button goes back normally.
 await render(page('/manuale/condizioni-prono',undefined));calls.length=0;
 await clickBack();
 assert.deepEqual(calls,['back'],'inside the site the previous page is used');
 // Coming back to the first card (browser back), there is no site page before it any more.
 await act(async()=>window.dispatchEvent(new window.PopStateEvent('popstate')));
 await render(page('/spell/dardo-incantato','/grimorio'));calls.length=0;
 await clickBack();
 assert.deepEqual(calls,['push:/grimorio'],'returning to the shared card restores the fallback');
 await render(React.createElement('div'));

 // Bottom navigation: five public sections, active item marked, hidden in the admin area.
 pathname='/spell/dardo-incantato';calls.length=0;
 await render(React.createElement(BottomNav));
 const links=[...document.querySelectorAll('nav a')];
 assert.deepEqual(links.map(a=>a.textContent),['Home','Incantesimi','Bestiario','Compendio','Preferiti']);
 assert.equal(document.querySelector('a[aria-current="page"]').textContent,'Incantesimi','a spell sheet highlights Incantesimi');
 // While idle only the two lists are prepared; the other places when the mouse reaches them or they get the focus
 // (once), never at a touch (the tap fetches the page itself: no double download).
 assert.deepEqual(calls,['prefetch:/grimorio','prefetch:/bestiario']);
 calls.length=0;
 const hover=(href,pointerType)=>act(async()=>{const e=new window.Event('pointerover',{bubbles:true});e.pointerType=pointerType;document.querySelector(`nav a[href="${href}"]`).dispatchEvent(e);});
 await hover('/preferiti','touch');
 assert.deepEqual(calls,[],'a finger does not start a prefetch');
 for(const href of ['/compendio','/preferiti','/compendio','/grimorio'])await hover(href,'mouse');
 await act(async()=>document.querySelector('nav a[href="/"]').focus());
 assert.deepEqual(calls,['prefetch:/compendio','prefetch:/preferiti','prefetch:/'],'mouse and keyboard prepare a place once; the lists are already prepared');
 // The Home prerendered by Vercel has the path «/index»: same markup as «/» in the browser (no hydration error #418).
 for(const home of ['/','/index']){pathname=home;await render(React.createElement(BottomNav,{key:home}));assert.equal(document.querySelector('a[aria-current="page"]').textContent,'Home',`${home} highlights Home`);}
 assert.match(fs.readFileSync('components/layout/content-frame.tsx','utf8'),/isHomePath\(pathname\)/,'the content frame treats «/index» as the Home');
 pathname='/admin';calls.length=0;
 await render(React.createElement(BottomNav,{key:'admin'}));
 assert.equal(document.querySelector('nav'),null,'the admin area has no public navigation');
 assert.deepEqual(calls,[],'the admin area does not prefetch public pages');

 // Install prompt: hidden when installed or recently dismissed; manual steps on iPhone Safari.
 const {InstallPrompt}=load('components/install-prompt.tsx');
 const match=standalone=>{window.matchMedia=()=>({matches:standalone})};
 const iphone='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
 const wait=ms=>act(async()=>new Promise(r=>setTimeout(r,ms)));
 match(true);setUserAgent(iphone);
 await render(React.createElement(InstallPrompt,{key:'installed'}));await wait(1300);
 assert.equal(document.body.textContent.includes('Aggiungi Il Grimorio.App'),false,'installed app shows no prompt');
 match(false);window.localStorage.setItem('grimorio-install-dismissed',String(Date.now()+86400000));
 await render(React.createElement(InstallPrompt,{key:'dismissed'}));await wait(1300);
 assert.equal(document.body.textContent.includes('Aggiungi Il Grimorio.App'),false,'a recent dismissal is respected');
 window.localStorage.removeItem('grimorio-install-dismissed');
 await render(React.createElement(InstallPrompt,{key:'iphone'}));await wait(1300);
 assert.ok(document.body.textContent.includes('Aggiungi a Home'),'iPhone Safari shows the manual steps');
 await act(async()=>document.querySelector('button[aria-label="Chiudi"]').dispatchEvent(new MouseEvent('click',{bubbles:true})));
 assert.equal(document.body.textContent.includes('Aggiungi Il Grimorio.App'),false);
 assert.ok(Number(window.localStorage.getItem('grimorio-install-dismissed'))>Date.now()+6*86400000,'closing hides it for seven days');
 setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1');
 window.localStorage.removeItem('grimorio-install-dismissed');
 await render(React.createElement(InstallPrompt,{key:'chrome-ios'}));await wait(1300);
 assert.equal(document.body.textContent.includes('Aggiungi Il Grimorio.App'),false,'other iPhone browsers cannot add to Home: no prompt');

 // Admin delete button: confirmation first, then a clear message if the deletion fails.
 const {AdminDeleteButton}=load('components/admin-delete-button.tsx');
 const deleted=[];let answer=false;global.confirm=window.confirm=()=>answer;
 const action=async form=>{deleted.push(form.get('id'));return {ok:false,error:'Eliminazione non riuscita: la scheda è ancora presente. Riprova.'};};
 await render(React.createElement(AdminDeleteButton,{id:'scudo',nome:'Scudo',action}));
 const submit=()=>act(async()=>{document.querySelector('form').requestSubmit();await new Promise(r=>setTimeout(r,20));});
 await submit();
 assert.deepEqual(deleted,[],'nothing is deleted without confirmation');
 answer=true;await submit();
 assert.deepEqual(deleted,['scudo']);
 assert.match(document.querySelector('[role="alert"]').textContent,/Eliminazione non riuscita/,'the failure is shown next to the button');
 await act(async()=>root.unmount());
 console.log('UI shell: admin delete confirmation and error, back button (shared links go to the list, in-site back otherwise), bottom navigation (active section, idle prefetch, hidden in admin), install prompt (installed, dismissed, iPhone Safari, other iPhone browsers).');
})().catch(error=>{console.error(error);process.exit(1);});
