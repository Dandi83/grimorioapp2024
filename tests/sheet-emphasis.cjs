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
assert.match(html('A volontà: <em>individuazione del magico, creare cibo e bevande</em> (può creare vino)<br>1/giorno ciascuno: <em>desiderio</em>'),/<span class="italic">individuazione del magico, creare cibo e bevande<\/span> \(può creare vino\)<br\/>1\/giorno ciascuno: <span class="italic">desiderio<\/span>/,'casting lists keep 2014 spell names italic');
assert.ok(html('<em>Attacco a distanza con incantesimo:</em> +7').includes(rule('Attacco a distanza con incantesimo:')),'SRD 5.1 spell attack wording');
assert.ok(!html('Nel suo covo: <em>parola qualsiasi</em>').includes('italic'),'outside casting lists stray italics stay plain');
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
// 2014 casting lists (plain labels) are grouped exactly like the 2024 ones, text unchanged.
const lich14=renderToStaticMarkup(createElement(MonsterText,{html:'<strong>Incantesimi.</strong> Il lich è un incantatore di 18° livello:<br>Trucchetti (a volontà): <em>mano magica, raggio di gelo</em><br>1° livello (4 slot): <em>dardo incantato, scudo</em><br>3/giorno ciascuno: <em>parola insolita</em>'}));
const groups=[...lich14.matchAll(/data-spell-frequency="true"/g)].length;
assert.equal(groups,3,'one group per 2014 casting line');
for(const label of ['Trucchetti (a volontà):','1° livello (4 slot):','3/giorno ciascuno:'])assert.ok(lich14.includes(`<span class="font-semibold text-primary">${label}</span>`),label);
assert.match(lich14,/<span class="italic">parola insolita<\/span>/,'2014 names missing from the catalog stay italic in their group');
assert.equal(lich14.replace(/<[^>]+>/g,'').replace(/\s+/g,''),'Incantesimi.Illichèunincantatoredi18°livello:Trucchetti(avolontà):manomagica,raggiodigelo1°livello(4slot):dardoincantato,scudo3/giornociascuno:parolainsolita','same words in the same order');
assert.ok(!renderToStaticMarkup(createElement(MonsterText,{html:'Il drago può usare questa azione 3/giorno.'})).includes('data-spell-frequency'),'prose mentioning a frequency is not a list');
console.log('Sheet emphasis: same formulas italic on every sheet, spell names italic, stray italics plain, bold and tables unchanged, 2014 casting lists grouped like 2024.');
