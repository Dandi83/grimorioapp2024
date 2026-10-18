const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {createRequire} = require('node:module');

const filename = path.resolve('lib/monster-editor-content.ts');
assert.ok(fs.existsSync(filename), 'guided content serializer must exist');
const mod = {exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync(filename,'utf8'), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText)(createRequire(filename),mod,mod.exports);
const {parseMonsterContent, serializeMonsterContent, escapeEditorText, sanitizeEditorHtml} = mod.exports;

// A conversion that flattens markup or rewrites untouched source must fail here.
for (const file of ['srd-monsters-5.2.1-it.json','srd-animals-5.2.1-it.json','srd-monsters-5.1-it.json']) {
  for (const {monster} of require('../lib/data/'+file).records) {
    for (const field of ['tratti','azioni','reazioni','azioni_leggendarie','descrizione']) {
      const source = monster[field] || '';
      const state = parseMonsterContent(source);
      assert.equal(serializeMonsterContent(state),source,`${monster.id}.${field}: untouched contents must remain byte-for-byte identical`);
    }
  }
}
const source = '<strong>Morso.</strong> +5, danni perforanti.<br><br><strong>Magia.</strong> Lancia <em>invisibilità</em>.';
const state = parseMonsterContent(source);
assert.equal(state.blocks.length,2);
assert.equal(state.blocks[0].title,'Morso.');
assert.equal(state.blocks[1].body,' Lancia <em>invisibilità</em>.');
state.blocks[0].title = 'Morso gelido';
const edited = serializeMonsterContent(state);
assert.ok(edited.startsWith('<strong>Morso gelido.</strong>'));
assert.ok(edited.includes('<em>invisibilità</em>'), 'editing one title preserves inline spell formatting in other blocks');
const blank = parseMonsterContent('');
blank.blocks.push({id:'new', title:'Soffio <gelido>', body:'12 danni da freddo.<br>Il bersaglio è paralizzato.'});
assert.equal(serializeMonsterContent(blank),'<strong>Soffio &lt;gelido&gt;.</strong> 12 danni da freddo.<br>Il bersaglio è paralizzato.');
blank.blocks.push({id:'empty', title:'', body:''});
assert.equal(serializeMonsterContent(blank).includes('<strong></strong>'), false);
assert.equal(escapeEditorText('<img src=x onerror=alert(1)> & "'), '&lt;img src=x onerror=alert(1)&gt; &amp; &quot;');
assert.equal(sanitizeEditorHtml('<div>Uno</div><div>Due <b>forti</b> e <i>magici</i></div>'), 'Uno<br>Due <strong>forti</strong> e <em>magici</em>');
assert.equal(sanitizeEditorHtml('Primo paragrafo.<br><br>Secondo paragrafo.'), 'Primo paragrafo.<br><br>Secondo paragrafo.', 'deliberate paragraph spacing must survive editing');
assert.equal(sanitizeEditorHtml('<div>Uno</div><div><br></div><div>Due</div>'), 'Uno<br><br>Due', 'a blank visual line becomes a paragraph break');
const safe = sanitizeEditorHtml('<script>alert(1)</script><a href="javascript:alert(1)">testo</a><img src=x onerror=alert(1)><strong onclick="alert(2)">titolo</strong>');
assert.equal(safe,'testo<strong>titolo</strong>');
assert.ok(!safe.includes('script') && !safe.includes('onclick'));
console.log('Guided monster content: all 340 sources round-trip unchanged; named blocks, targeted edits, spell emphasis, line breaks and safe paste passed.');
