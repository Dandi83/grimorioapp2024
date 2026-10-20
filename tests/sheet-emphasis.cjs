const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const {createElement}=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const m={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync('components/html-text.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(require,m,m.exports);
const {HtmlText,MonsterText}=m.exports;
const html=(source,props={})=>renderToStaticMarkup(createElement(HtmlText,{html:source,...props}));
const rule=label=>`<span class="italic text-foreground">${label}</span>`;

// The same attack looks identical whether or not the source had italics.
const official=html('<strong>Esplosione arcana. </strong><em>Tiro per colpire in mischia o a distanza:</em> +6, portata 1,5 m.<em> Colpito:</em> 16 (3d8 + 3) danni.');
const plain=html('<strong>Esplosione arcana. </strong>Tiro per colpire in mischia o a distanza: +6, portata 1,5 m. Colpito: 16 (3d8 + 3) danni.');
assert.ok(plain.includes(rule('Tiro per colpire in mischia o a distanza:'))&&plain.includes(rule('Colpito:')),'formulas are italic even without source italics');
assert.equal(official.replace(/\s+/g,' '),plain.replace(/\s+/g,' '),'official and hand-typed sheets render the same');

// Formulas split across tags, 2014 wording, saving throws and spell outcomes.
assert.ok(html('<em>Primo</em> <em>fallimento:</em> trattenuto.').includes(rule('Primo fallimento:')));
assert.ok(html('Attacco con arma da mischia: +4 al tiro per colpire.').includes(rule('Attacco con arma da mischia:')));
assert.ok(html('<em>Attacco con arma da mischia o con arma a distanza:</em> +6').includes(rule('Attacco con arma da mischia o con arma a distanza:')),'SRD 5.1 wording');
assert.match(html('1° livello (4 slot): <em>armatura magica*, dardo incantato</em>'),/<span class="italic">armatura magica\*, dardo incantato<\/span>/,'2014 spell lists keep italics, footnote marks included');
assert.ok(html('Tiro salvezza su Destrezza: CD 14. Fallimento: 10 danni. Successo: danni dimezzati.').includes(rule('Tiro salvezza su Destrezza:')));
assert.ok(html('Tiro salvezza fallito: 4d6 danni.').includes(rule('Tiro salvezza fallito:')));
assert.ok(!html('in caso di fallimento: nulla').includes('italic'),'ordinary prose is never italic');

// Spell names stay italic (linked when a reference exists); other italics become plain text.
const spells=html('<em>Cono di freddo</em>, <em>palla di fuoco (di 4º livello)</em> e <i>una parola enfatizzata</i>.',{spellReferences:[{label:'Cono di freddo',href:'/spell/cono-di-freddo'}]});
assert.match(spells,/<span class="italic"><a href="\/spell\/cono-di-freddo"[^>]*>Cono di freddo<\/a><\/span>/);
assert.match(spells,/<span class="italic">palla di fuoco \(di 4º livello\)<\/span>/);
assert.ok(spells.includes(' e una parola enfatizzata.')&&!/italic[^>]*>una parola/.test(spells),'stray italics are plain');

// Bold labels stay bold; tables keep their text untouched.
assert.ok(!html('<b>Tiro salvezza superato:</b> metà danni.').includes('text-foreground'));
assert.ok(html('<pre>Colpito: 1d6</pre>').includes('Colpito: 1d6</pre>'));

// Casting lists keep one line per frequency.
const list=renderToStaticMarkup(createElement(MonsterText,{html:'<strong>Incantesimi.</strong> Lancia: <strong>A volontà:</strong> <em>luce</em>'}));
assert.match(list,/data-spell-frequency="true"[\s\S]*<span class="italic">luce<\/span>/);
console.log('Sheet emphasis: same formulas italic on every sheet, spell names italic, stray italics plain, bold and tables unchanged.');
