import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
let pathname = '/';
const code = ts.transpileModule(readFileSync(new URL('../components/bottom-nav.tsx',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const mod = {exports:{}};
// The items are shared with the side column of computers (components/nav-items.ts).
const navItems = { exports: {} };
new Function('require','module','exports',ts.transpileModule(readFileSync(new URL('../components/nav-items.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText)(require,navItems,navItems.exports);
new Function('require','module','exports',code)(id => id === 'next/navigation' ? { usePathname: () => pathname, useRouter: () => ({prefetch:()=>{}}) } : id === 'next/link' ? { __esModule:true, default:({children,prefetch,...props})=>{assert.equal(prefetch,false,'Main navigation defers prefetch to idle work');return createElement('a',props,children)} } : id === '@/components/navigation-memory' ? { notePathChange: () => {} } : id === '@/components/nav-items' ? navItems.exports : require(id),mod,mod.exports);
const {BottomNav} = mod.exports;
const cases = [
  ['/', '/', 'Home'],
  ['/grimorio', '/grimorio', 'Incantesimi'],
  ['/spell/amicizia', '/grimorio', 'Incantesimi'],
  ['/bestiario', '/bestiario', 'Bestiario'],
  ['/mostro/test', '/bestiario', 'Bestiario'],
  ['/compendio', '/compendio', 'Compendio'],
  ['/equipaggiamento', '/compendio', 'Compendio'],
  ['/equipaggiamento/armi', '/compendio', 'Compendio'],
  ['/equipaggiamento/armi/pugnale', '/compendio', 'Compendio'],
  ['/equipaggiamento/armature', '/compendio', 'Compendio'],
  ['/equipaggiamento/armature/scudo', '/compendio', 'Compendio'],
  ['/avanzamento', '/compendio', 'Compendio'],
  ['/preferiti', '/preferiti', 'Preferiti'],
];
for (const [path,activeHref,activeLabel] of cases) {
  pathname=path;
  const html=renderToStaticMarkup(createElement(BottomNav));
  const links=[...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
  assert.equal(links.length,5,'The bottom navigation must have five items, with no dice section');
  assert.deepEqual(links.map(m=>m[2].replace(/<[^>]*>/g,'')),['Home','Incantesimi','Bestiario','Compendio','Preferiti']);
  const active=links.filter(m=>m[1].includes('aria-current="page"'));
  assert.equal(active.length,1);
  assert.ok(active[0][1].includes(`href="${activeHref}"`));
  assert.equal(active[0][2].replace(/<[^>]*>/g,''),activeLabel);
  assert.ok(!html.includes('/dadi'));
}
pathname='/admin';
assert.equal(renderToStaticMarkup(createElement(BottomNav)),'');
pathname='/fonti';
const sourcesNav=renderToStaticMarkup(createElement(BottomNav));
assert.ok(!sourcesNav.includes('href="/fonti"'),'Legal information is available from the home header');
assert.ok(!sourcesNav.includes('aria-current="page"'));
const home=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
const sources=readFileSync(new URL('../app/fonti/page.tsx',import.meta.url),'utf8');
assert.ok(sources.includes('* Progetto fan-made a scopo hobbistico.'));
assert.ok(!sources.includes('puramente personale e non commerciale'));
assert.match(sources,/fonti e licenze/i);
assert.ok(!home.includes('Progetto fan-made'));
assert.ok(!home.includes('Fonti e licenze'));
assert.ok(!home.includes('href="/preferiti"'));
assert.ok(home.includes('href="/admin"'));
assert.ok(!home.includes('/equipaggiamento'),'Equipaggiamento is reached from the Compendio, not from Home');
assert.ok(home.includes('href="/fonti"'));
assert.ok(home.includes('Termini e condizioni'));
const dicePage=readFileSync(new URL('../app/dadi/page.tsx',import.meta.url),'utf8');
assert.ok(!dicePage.includes('DiceRoller'),'The removed dice section must not render');
assert.match(dicePage,/redirect\("\/"\)/,'Existing dice URLs must return to Home');
assert.ok(!readFileSync(new URL('../app/layout.tsx',import.meta.url),'utf8').includes('lancia i dadi'));
console.log('[navigation] Home, Incantesimi, Bestiario, Compendio (also active in Equipaggiamento) and Preferiti verified; admin and legal links stay in the home header, with disclaimer and licenses on the sources page.');
