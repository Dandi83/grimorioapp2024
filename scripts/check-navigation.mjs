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
new Function('require','module','exports',code)(id => id === 'next/navigation' ? { usePathname: () => pathname } : id === 'next/link' ? { __esModule:true, default:({children,...props})=>createElement('a',props,children) } : require(id),mod,mod.exports);
const {BottomNav} = mod.exports;
const cases = [
  ['/', '/', 'Home'],
  ['/grimorio', '/grimorio', 'Incantesimi'],
  ['/spell/amicizia', '/grimorio', 'Incantesimi'],
  ['/bestiario', '/bestiario', 'Mostri'],
  ['/mostro/test', '/bestiario', 'Mostri'],
  ['/preferiti', '/preferiti', 'Preferiti'],
];
for (const [path,activeHref,activeLabel] of cases) {
  pathname=path;
  const html=renderToStaticMarkup(createElement(BottomNav));
  const links=[...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
  assert.equal(links.length,4,'The bottom navigation must have four items, with no dice section');
  assert.deepEqual(links.map(m=>m[2].replace(/<[^>]*>/g,'')),['Home','Incantesimi','Mostri','Preferiti']);
  const active=links.filter(m=>m[1].includes('aria-current="page"'));
  assert.equal(active.length,1);
  assert.ok(active[0][1].includes(`href="${activeHref}"`));
  assert.equal(active[0][2].replace(/<[^>]*>/g,''),activeLabel);
  assert.ok(!html.includes('/dadi'));
}
pathname='/admin';
assert.equal(renderToStaticMarkup(createElement(BottomNav)),'');
const home=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
assert.ok(home.includes('* Progetto fan-made a scopo hobbistico.'));
assert.ok(!home.includes('puramente personale e non commerciale'));
assert.ok(home.includes('Fonti e licenze'));
const dicePage=readFileSync(new URL('../app/dadi/page.tsx',import.meta.url),'utf8');
assert.ok(!dicePage.includes('DiceRoller'),'The removed dice section must not render');
assert.match(dicePage,/redirect\("\/"\)/,'Existing dice URLs must return to Home');
assert.ok(!readFileSync(new URL('../app/layout.tsx',import.meta.url),'utf8').includes('lancia i dadi'));
console.log('[navigation] Four menu items, nested active states, admin exclusion, removed dice section and hobby disclaimer verified.');
