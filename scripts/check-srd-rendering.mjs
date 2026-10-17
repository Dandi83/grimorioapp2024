import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

const require = createRequire(import.meta.url);
const data = JSON.parse(readFileSync(new URL('../lib/data/srd-italiano-5.2.1.json',import.meta.url),'utf8'));
const review = JSON.parse(readFileSync(new URL('../lib/data/srd-revisions-20261017.json',import.meta.url),'utf8'));
const helperUrl = new URL('../lib/srd-descriptions.ts', import.meta.url);
assert.ok(existsSync(helperUrl), 'The app must resolve audited source descriptions without changing the database');
function loadTs(url) {
  const source = ts.transpileModule(readFileSync(url,'utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const mod = {exports:{}};
  new Function('require','module','exports',source)(id => id.endsWith('spells-types') ? loadTs(new URL('../lib/spells-types.ts',import.meta.url)) : id.endsWith('srd-italiano-5.2.1.json') ? data : id.endsWith('srd-revisions-20261017.json') ? review : id.endsWith('original-description-ids.json') ? JSON.parse(readFileSync(new URL('../lib/data/original-description-ids.json',import.meta.url),'utf8')) : require(id),mod,mod.exports);
  return mod.exports;
}
const { applySrdDescription, getSrdSource } = loadTs(helperUrl);
const provenance=loadTs(new URL('../lib/spells-types.ts',import.meta.url));
assert.equal(typeof provenance.hasUnverifiedDescription,'function','Ten unverified legacy descriptions need a provenance marker');
for(const spell of review.excluded) assert.equal(provenance.hasUnverifiedDescription(spell.id),true,`${spell.id}: missing marker`);
for(const spell of data.spells) assert.equal(provenance.hasUnverifiedDescription(spell.id),false,`${spell.id}: official SRD must not be marked`);
assert.equal(provenance.hasUnverifiedDescription('dardo-stregato'),true,'Original non-SRD summaries also need an asterisk');
assert.equal(provenance.hasUnverifiedDescription('unknown'),false);
const markerUrl=new URL('../components/spell-provenance-marker.tsx',import.meta.url);
assert.ok(existsSync(markerUrl),'Spell names need a small accessible asterisk');
const {SpellProvenanceMarker}=loadTs(markerUrl);
for(const spell of review.excluded){
  const marker=renderToStaticMarkup(createElement(SpellProvenanceMarker,{id:spell.id}));
  assert.match(marker,/<sup\b[^>]*>\*<\/sup>/);
  assert.match(marker,/aria-label="Descrizione non verificata nel SRD"/);
}
assert.equal(renderToStaticMarkup(createElement(SpellProvenanceMarker,{id:'palla-di-fuoco'})),'');
const legacy=JSON.parse(readFileSync(new URL('../tests/fixtures/legacy-eldritch-blast.json',import.meta.url),'utf8'));
assert.ok(legacy.descrizione.trim(), 'The legacy regression fixture must contain the original nonempty database text');
const canonical=data.spells.find(s=>s.id==='deflagrazione-occulta');
assert.equal(applySrdDescription(legacy).descrizione,canonical.descrizione,'An audited legacy description must be replaced with the full source');
assert.equal(getSrdSource(legacy.id,applySrdDescription(legacy).descrizione).sourceName,'Deflagrazione occulta');
const laterEdit={...legacy,descrizione:'Testo personalizzato salvato dopo la verifica'};
assert.equal(applySrdDescription(laterEdit),laterEdit,'A later editorial change must not be overwritten');
const offSource={id:'amicizia',descrizione:'Descrizione precedente fuori dal SRD'};
assert.equal(applySrdDescription(offSource),offSource,'The ten non-SRD legacy descriptions must remain unchanged');
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
const slotTitle='Utilizzo di uno slot incantesimo di livello superiore';
const headingFixtures=[
  `Effetto normale.<br><br>${slotTitle}. Aggiungi una creatura.`,
  `<b>${slotTitle}.</b> Aggiungi una creatura.`,
  'Utilizzo di uno slot<br>incantesimo di livello superiore: Aggiungi una creatura.',
  `Prima.<br><br><pre>d6  Effetto\n1   Luce</pre><br><br>${slotTitle}. Aggiungi una creatura.`,
];
for(const html of headingFixtures){
  const rendered=renderToStaticMarkup(createElement(HtmlText,{html}));
  assert.match(rendered,/<h3[^>]*class="[^"]*text-primary[^>]*>Utilizzo di uno slot incantesimo di livello superiore[.:]?<\/h3>/,'Higher-slot instructions must have a separate yellow subheading');
  assert.ok(rendered.includes('<p') && rendered.includes('Aggiungi una creatura.'),'The rule body must remain readable after the subheading');
}
const plainWithoutWhitespace=html=>html.replace(/<[^>]+>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&#x27;/g,"'").replace(/&amp;/g,'&').replace(/\s/g,'');
let slotSections=0;
for(const spell of data.spells){
  const count=spell.descrizione.split(slotTitle).length-1;
  const rendered=renderToStaticMarkup(createElement(HtmlText,{html:spell.descrizione}));
  assert.equal((rendered.match(/<h3\b/g)||[]).length,count,`${spell.id}: every higher-slot label must be a subheading`);
  assert.equal(plainWithoutWhitespace(rendered),plainWithoutWhitespace(spell.descrizione),`${spell.id}: styling must not change the source text`);
  slotSections+=count;
}
console.log(`[srd] ${slotSections} higher-slot subheadings styled across all ${data.spells.length} official records; source text preserved.`);
console.log('[srd] Approved legacy replacements, preservation of later edits, source attribution and safe table rendering verified.');
