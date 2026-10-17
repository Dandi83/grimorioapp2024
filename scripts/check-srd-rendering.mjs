import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

const require = createRequire(import.meta.url);
const data = JSON.parse(readFileSync(new URL('../lib/data/srd-italiano-5.2.1.json',import.meta.url),'utf8'));
const helperUrl = new URL('../lib/srd-descriptions.ts', import.meta.url);
assert.ok(existsSync(helperUrl), 'The app must resolve audited source descriptions without changing the database');
function loadTs(url) {
  const source = ts.transpileModule(readFileSync(url,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const mod = {exports:{}};
  new Function('require','module','exports',source)(id => id.endsWith('srd-italiano-5.2.1.json') ? data : require(id),mod,mod.exports);
  return mod.exports;
}
const { applySrdDescription, getSrdSource } = loadTs(helperUrl);
const target=data.spells.find(s=>s.id==='teletrasporto');
const empty={id:target.id,nome_italiano:'TELETRASPORTO',descrizione:'  ',livello:'existing metadata'};
const result=applySrdDescription(empty);
assert.equal(result.descrizione,target.descrizione);
assert.equal(result.livello,target.livello,'An empty OCR record must use the source metadata');
assert.equal(empty.descrizione,'  ', 'Read overlay must never mutate original records');
const existing={...empty,descrizione:'Testo approvato dall’utente'};
assert.equal(applySrdDescription(existing),existing,'Existing descriptions must win over SRD content');
const nonSrd={...empty,id:'dardo-stregato',descrizione:''};
assert.equal(applySrdDescription(nonSrd),nonSrd,'Non-SRD entries must stay empty');
assert.equal(getSrdSource(target.id,result.descrizione).sourceName,'Teletrasporto');
assert.equal(getSrdSource(target.id,'Testo personale'),undefined,'Custom text must not be labelled as verbatim SRD');
const { HtmlText } = loadTs(new URL('../components/html-text.tsx',import.meta.url));
const output=renderToStaticMarkup(createElement(HtmlText,{html:'Prima<br><br><pre>A    B\n01–05 &lt;script&gt;</pre><br><br>Dopo'}));
assert.match(output,/<pre[^>]*>/,'Source tables must retain a real preformatted container');
assert.ok(output.includes('A    B\n01–05 &lt;script&gt;'),'Table spacing and safe escaping must survive rendering');
assert.ok(!output.includes('<script>'));
assert.match(renderToStaticMarkup(createElement(HtmlText,{html:'<b>1d4 + 1</b><br>Fine'})),/font-semibold/,'Existing description formatting must stay supported');
console.log('[srd] Read-only overlay, preservation of existing text, source attribution and safe table rendering verified.');
