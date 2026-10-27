// «Modifica» on the public pages for the administrator (components/admin-edit, lib/admin-edit-link.ts):
// safe return paths, direct editor addresses, buttons drawn only after the server confirms the session,
// never in the server HTML, gone after «Esci».
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://ilgrimorio.app/spell/palla-di-fuoco?edizione=2024'});
for(const key of ['window','document','HTMLElement','Event','MouseEvent'])global[key]=dom.window[key];
Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true});
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client');
const {renderToStaticMarkup}=require('react-dom/server');
const read=file=>fs.readFileSync(file,'utf8');
const cache={};
function load(file,deps={}){
  const filename=path.resolve(file);
  if(cache[filename])return cache[filename];
  const mod={exports:{}};cache[filename]=mod.exports;
  const code=ts.transpileModule(read(filename),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  new Function('require','module','exports',code)(id=>deps[id]??(id.startsWith('@/')?load(id.slice(2)+(fs.existsSync(id.slice(2)+'.tsx')?'.tsx':'.ts'),deps):require(id)),mod,mod.exports);
  return cache[filename]=mod.exports;
}

const link=load('lib/admin-edit-link.ts');
// Return paths: only paths of this site.
for(const [value,expected] of [
  ['/spell/palla-di-fuoco','/spell/palla-di-fuoco'],
  ['/equipaggiamento/armi?edizione=2014','/equipaggiamento/armi?edizione=2014'],
  ['/mostro/lich#azioni','/mostro/lich#azioni'],
  ['https://evil.example/x',undefined],['//evil.example/x',undefined],['/\\evil.example',undefined],
  ['javascript:alert(1)',undefined],['spell/x',undefined],['',undefined],[undefined,undefined],[['/a'],undefined],
  ['/a\nb',undefined],['/a%0d%0ab','/a%0d%0ab'],[`/${'x'.repeat(700)}`,undefined],
])assert.equal(link.safeReturnPath(value),expected,String(value));
// Editor addresses: spells and creatures open their editor as its own page, the other cards /admin/contenuti with the edition.
assert.equal(link.adminEditHref({kind:'incantesimo',id:'palla-di-fuoco'},'/spell/palla-di-fuoco'),'/admin/incantesimi/palla-di-fuoco?ritorno=%2Fspell%2Fpalla-di-fuoco');
assert.equal(link.adminEditHref({kind:'mostro',id:'bugbear-2014'},'/mostro/bugbear-2014'),'/admin/mostri/bugbear-2014?ritorno=%2Fmostro%2Fbugbear-2014');
assert.equal(link.adminEditHref({kind:'contenuto',section:'armi',id:'ascia',edition:'2014'},'/equipaggiamento/armi?edizione=2014'),'/admin/contenuti/armi/ascia?edizione=2014&ritorno=%2Fequipaggiamento%2Farmi%3Fedizione%3D2014');
assert.equal(link.adminEditHref({kind:'incantesimo',id:'x'},'https://evil.example'),'/admin/incantesimi/x','an outside address is dropped');
// With the card's edition: through /admin/edizione (a redirect that moves the admin area), straight on to the editor.
assert.equal(link.adminEditHref({kind:'incantesimo',id:'amicizia',edition:'2014'},'/spell/amicizia'),'/admin/edizione?valore=2014&poi=%2Fadmin%2Fincantesimi%2Famicizia%3Fimpostata%3D1%26ritorno%3D%252Fspell%252Famicizia');
assert.equal(link.adminEditHref({kind:'mostro',id:'orco-2014',edition:'2014'}),'/admin/edizione?valore=2014&poi=%2Fadmin%2Fmostri%2Forco-2014%3Fimpostata%3D1');

// The buttons: nothing without a session checked by the server, never in the server HTML.
const session=load('components/admin-edit/admin-session.tsx',{'next/navigation':{usePathname:()=>window.location.pathname}});
const {AdminEditButton,AdminEditPencil}=load('components/admin-edit/admin-edit-button.tsx');
const target={kind:'incantesimo',id:'palla-di-fuoco'};
assert.equal(renderToStaticMarkup(React.createElement(session.AdminSessionProvider,null,React.createElement(AdminEditButton,{target}),React.createElement(AdminEditPencil,{target,name:'Palla di fuoco'}))),'','server HTML: no button');

const root=createRoot(document.getElementById('root'));
let asked=0,answer=true;
global.fetch=async url=>{assert.equal(url,'/api/admin/sessione');asked++;return {json:async()=>({admin:answer})};};
const mount=async()=>{await act(async()=>root.render(React.createElement('div')));await act(async()=>root.render(React.createElement(session.AdminSessionProvider,null,React.createElement(AdminEditButton,{target}),React.createElement(AdminEditPencil,{target:{kind:'contenuto',section:'armi',id:'ascia',edition:'2024'},name:'Ascia'}))));await act(async()=>new Promise(r=>setTimeout(r,10)));};
const buttons=()=>[...document.querySelectorAll('[data-admin-edit]')];
(async()=>{
  // A visitor (no hint cookie): the server is never asked, nothing is drawn.
  await mount();
  assert.equal(asked,0,'visitors never ask');assert.equal(buttons().length,0);
  // The administrator: the server confirms, the button and the pencil appear with the editor and the way back.
  document.cookie='grimorio_admin_ui=1; path=/';
  await mount();
  assert.equal(asked,1);assert.equal(buttons().length,2);
  assert.equal(buttons()[0].textContent,'Modifica');
  assert.equal(buttons()[0].getAttribute('href'),'/admin/incantesimi/palla-di-fuoco?ritorno=%2Fspell%2Fpalla-di-fuoco%3Fedizione%3D2024');
  assert.match(buttons()[0].className,/fixed bottom-\[calc\(92px\+env\(safe-area-inset-bottom,0px\)\)\] right-4/);assert.match(buttons()[0].className,/min-h-12/);
  assert.equal(buttons()[1].getAttribute('aria-label'),'Modifica Ascia');
  assert.equal(buttons()[1].getAttribute('href'),'/admin/contenuti/armi/ascia?edizione=2024&ritorno=%2Fspell%2Fpalla-di-fuoco%3Fedizione%3D2024');
  // An expired session: the server says no, nothing is drawn and the hint goes.
  answer=false;await mount();
  assert.equal(buttons().length,0);assert.ok(!document.cookie.includes('grimorio_admin_ui=1'),'hint removed');
  // After «Esci» (no hint): nothing, without asking.
  const before=asked;await mount();assert.equal(asked,before);assert.equal(buttons().length,0);
  await act(async()=>root.unmount());

  // Login sets the hint, logout removes it; the session answer is never cached.
  const auth=read('lib/admin-auth.ts');
  assert.match(auth,/store\.set\(ADMIN_HINT_COOKIE, "1", \{ httpOnly: false/);
  assert.match(auth,/store\.delete\(\{ name: ADMIN_HINT_COOKIE, path: "\/", secure: true \}\)/);
  const api=read('app/api/admin/sessione/route.ts');
  assert.match(api,/admin: await isAdmin\(\)/);assert.match(api,/"Cache-Control": "private, no-store"/);
  assert.match(read('app/layout.tsx'),/<AdminSessionProvider>/);
  // The service worker never handles the API: the answer never enters the offline copies.
  assert.ok(!/api/.test(read('lib/sw/service-worker.js').match(/const PUBLIC_PAGE = (.*);/)[1]));
  // Direct editors: login first, the card's edition, the way back only to this site; older ?modifica links go on to them.
  const view=read('components/admin-card-editor-view.tsx');
  assert.match(view,/if \(!\(await isAdmin\(\)\)\) return <AdminLogin \/>;/);
  assert.match(view,/const ritorno = safeReturnPath\(params\.ritorno\);/);
  assert.match(view,/redirect\(`\/admin\/edizione\?/);
  assert.match(view,/back=\{ritorno \?\? publicPath\}/);
  const lists=read('components/admin-list/admin-list-page.tsx');
  assert.match(lists,/if \(!\(await isAdmin\(\)\)\) return <AdminLogin \/>;\n  const params = await searchParams;\n  if \(typeof params\.modifica === "string"/);
  for(const segment of ['incantesimi','mostri']){
    assert.match(read(`app/admin/${segment}/[id]/page.tsx`),/<AdminCardEditorView kind=/);
    // While it loads: the cream page with the title of the editor, never the list.
    assert.match(read(`app/admin/${segment}/[id]/loading.tsx`),segment==='incantesimi'?/title="Modifica incantesimo"/:/title="Modifica creatura"/);
  }
  // The editor as the page: an open dialog in the server HTML, no modal, no list; focus on the title, not on the eye.
  const frame=read('components/admin-editor-frame.ts');
  assert.match(frame,/if \(!page\) dialog\.current\?\.showModal\(\);/);
  // Focus on the title, except «Rinomina» of the lists (?campo=nome): the name field.
  assert.match(frame,/else heading\.current\?\.focus\(/);
  assert.match(frame,/get\("campo"\) === "nome"/);
  for(const file of ['components/admin-spell-editor.tsx','components/admin-monster-editor.tsx','components/homebrew/admin-proposals.tsx']){
    const source=read(file);
    assert.match(source,/open=\{page \|\| undefined\}/,file);
    assert.match(source,/<h2 ref=\{heading\} tabIndex=\{-1\}/,file);
    assert.ok(!source.includes('showModal'),file);
  }
  const edition=read('app/admin/edizione/route.ts');
  assert.match(edition,/next && next\.startsWith\("\/admin\/"\) \? next : "\/admin"/,'the edition route only goes on into the admin area');
  assert.match(edition,/isAdminEdition\(valore\) && \(await isAdmin\(\)\)/,'the cookie only for the administrator');
  const content=read('app/admin/contenuti/[sezione]/[id]/page.tsx');
  assert.match(content,/if \(!\(await isAdmin\(\)\)\) return <AdminLogin \/>;/);
  assert.match(content,/const ritorno = safeReturnPath\(query\.ritorno\);/);
  // Where the buttons are: cards and the rows of the lists.
  for(const [file,pattern] of [
    ['app/spell/[id]/page.tsx',/<AdminEditButton target=\{\{ kind: "incantesimo", id: spell\.id, edition \}\}/],
    ['app/mostro/[id]/page.tsx',/<AdminEditButton target=\{\{ kind: "mostro", id: monster\.id, edition: homebrew \?/],
    ['app/oggetti-magici/[id]/page.tsx',/section: "oggetti-magici", id: entry\.id, edition: value/],
    ['app/classi/[id]/page.tsx',/section: "classi", id, edition/],
    ['app/manuale/[id]/page.tsx',/section: "condizioni", id: entry\.id, edition[\s\S]*section: "manuale"/],
    ['components/equipment/weapons-browser.tsx',/section: "armi", id: item\.id, edition/],
    ['components/equipment/armor-browser.tsx',/section: "armature", id: item\.id, edition/],
    ['components/equipment/gear-browser.tsx',/section: "avventura", id: row\.id, edition/],
    ['components/equipment/tools-browser.tsx',/section: "strumenti", id: row\.id, edition/],
    ['components/conditions-list.tsx',/section: "condizioni", id: row\.id, edition/],
  ])assert.match(read(file),pattern,file);
  console.log('Admin edit: safe return paths, direct editor addresses, buttons only after the server confirms the session (never in the server HTML, visitors never ask, gone after logout or expiry), login and edition checks, cards and list rows covered.');
})().catch(error=>{console.error(error);process.exit(1);});
