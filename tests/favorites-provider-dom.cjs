const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://preferiti.example.test'});
for(const key of ['window','document','HTMLElement','Event','MouseEvent','StorageEvent'])global[key]=dom.window[key];
Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true});
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client'),ts=require('typescript');
const filename=path.resolve('components/favorites-provider.tsx');
const mod={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(createRequire(filename),mod,mod.exports);
const {FavoritesProvider,useFavorites}=mod.exports;
const KEY='grimorio.favorites.v1';
let api;
function Probe(){api=useFavorites();return React.createElement('p',null,api.favorites.join(','));}
const root=createRoot(document.getElementById('root'));
const mount=async()=>{await act(async()=>root.render(React.createElement('div')));await act(async()=>root.render(React.createElement(React.StrictMode,null,React.createElement(FavoritesProvider,null,React.createElement(Probe)))));};
const saved=()=>JSON.parse(window.localStorage.getItem(KEY));

(async()=>{
 // Corrupted or foreign storage values never break the app: the list restarts empty.
 for(const raw of ['{}','null','"testo"','42','non json',JSON.stringify({a:1})]){
  window.localStorage.setItem(KEY,raw);
  await mount();
  assert.equal(api.loaded,true);
  assert.deepEqual(api.favorites,[],`value ${raw} is ignored`);
  await act(async()=>api.toggle('palla-di-fuoco'));
  assert.deepEqual(saved(),['palla-di-fuoco'],`toggle works after ${raw}`);
 }
 // A list keeps only text IDs, without duplicates.
 window.localStorage.setItem(KEY,JSON.stringify(['scudo',3,null,'scudo','mostro:aboleth']));
 await mount();
 assert.deepEqual(api.favorites,['scudo','mostro:aboleth']);
 assert.equal(api.isFavorite('mostro:aboleth'),true);

 // Two tabs: the other tab saves a favorite; this tab adopts it on the storage event.
 window.localStorage.setItem(KEY,JSON.stringify(['scudo','mostro:aboleth','dardo-incantato']));
 await act(async()=>window.dispatchEvent(new StorageEvent('storage',{key:KEY,newValue:window.localStorage.getItem(KEY)})));
 assert.deepEqual(api.favorites,['scudo','mostro:aboleth','dardo-incantato']);
 // Unrelated keys are ignored.
 await act(async()=>window.dispatchEvent(new StorageEvent('storage',{key:'altro',newValue:'[]'})));
 assert.equal(api.favorites.length,3);

 // Even without an event (e.g. delayed), a toggle starts from the latest saved list.
 window.localStorage.setItem(KEY,JSON.stringify(['scudo','mostro:aboleth','dardo-incantato','mostro:lich']));
 await act(async()=>api.toggle('palla-di-fuoco'));
 assert.deepEqual(saved(),['scudo','mostro:aboleth','dardo-incantato','mostro:lich','palla-di-fuoco'],'the other tab\'s favorite is not lost');
 await act(async()=>api.toggle('scudo'));
 assert.deepEqual(saved(),['mostro:aboleth','dardo-incantato','mostro:lich','palla-di-fuoco']);

 // Clearing storage in another tab empties the list here too.
 window.localStorage.removeItem(KEY);
 await act(async()=>window.dispatchEvent(new StorageEvent('storage',{key:KEY,newValue:null})));
 assert.deepEqual(api.favorites,[]);

 // Unavailable storage (private mode): favorites still work in memory.
 const proto=Object.getPrototypeOf(window.localStorage),get=proto.getItem,set=proto.setItem;
 proto.getItem=()=>{throw Error('blocked')};proto.setItem=()=>{throw Error('blocked')};
 await mount();
 await act(async()=>api.toggle('scudo'));
 assert.deepEqual(api.favorites,['scudo']);
 proto.getItem=get;proto.setItem=set;

 await act(async()=>root.unmount());
 console.log('Favorites: corrupted storage ignored, text IDs only, multi-tab sync and merge on toggle, unavailable storage tolerated.');
})().catch(error=>{console.error(error);process.exit(1);});
