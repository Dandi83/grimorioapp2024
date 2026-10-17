import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
function load(path){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX}}).outputText)(require,m,m.exports);return m.exports;}
const rows=JSON.parse(readFileSync(new URL('../lib/data/srd-monsters-5.2.1-it.json',import.meta.url))).records;
test('PDF apostrophes render naturally through the real HtmlText component for all monsters',()=>{const {HtmlText}=load('components/html-text.tsx');for(const r of rows)for(const key of ['tratti','azioni','azioni_bonus','reazioni','azioni_leggendarie']){const markup=renderToStaticMarkup(createElement(HtmlText,{html:r.monster[key]||''}));assert.ok(!markup.includes('&amp;#x27;'),`${r.sourceName}: visible escaped apostrophe`);}});
test('the actual crawling-claw swarm record belongs to the undead filter',()=>{const {typeCategory}=load('lib/monsters-types.ts');const swarm=rows.find(r=>r.sourceName==='Orda di artigli striscianti').monster;assert.equal(typeCategory(swarm.tipo),'Non morto');});
