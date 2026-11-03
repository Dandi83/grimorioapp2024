// PROMPT 49: the SRD feats. 17 of the SRD 5.2.1 Italian manual (p. 98–100) and «Lottatore» of the SRD 5.1 (p. 84): texts
// identical to the source, categories and prerequisites as printed, official English names, search and sitemap only while
// the section is shown (it starts «In arrivo»).
// Run: NODE_OPTIONS=--require=./tests/register-ts.cjs node tests/feats.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
require.cache[require.resolve('server-only')]={exports:{}};
const {feats,getFeat,splitLead,FEAT_CATEGORIES}=require('../lib/feats.ts');
const names=JSON.parse(fs.readFileSync('lib/data/nomi-inglesi-srd.json','utf8'));
const manual=JSON.parse(fs.readFileSync('lib/data/srd-manual-5.2.1-it.json','utf8')).entries.find(e=>e.id==='personaggi-talenti');

const EXPECTED={
 Origini:['Abile','Aggressore selvaggio','Allerta','Iniziato alla magia'],
 Generale:['Aumento dei punteggi di caratteristica','Lottatore'],
 'Stile di combattimento':['Combattere con armi possenti','Combattere con due armi','Difesa','Tiro'],
 'Dono epico':['Dono del fato','Dono della vista pura','Dono delle abilità di combattimento',"Dono dell'offensiva irresistibile",'Dono dello spirito notturno','Dono del richiamo degli incantesimi','Dono del viaggio dimensionale'],
};
const of2024=feats.filter(f=>f.editions['2024']);
assert.equal(of2024.length,17);
for(const category of FEAT_CATEGORIES)assert.deepEqual(of2024.filter(f=>f.editions['2024'].categoria===category).map(f=>f.editions['2024'].nome),EXPECTED[category],category);
assert.deepEqual(feats.filter(f=>f.editions['2014']).map(f=>f.id),['lottatore'],'2014: Lottatore only');
assert.ok(feats.every(f=>/^[a-z0-9-]+$/.test(f.id)));

// Texts identical to the manual: the blocks of each feat, in order, between its heading and the next.
const headings=manual.blocks.map((b,i)=>[b,i]).filter(([b])=>b.kind==='heading');
for(const feat of of2024){
 const view=feat.editions['2024'];
 const at=manual.blocks.findIndex(b=>b.kind==='heading'&&b.text===view.nome);
 const next=headings.find(([,i])=>i>at)?.[1]??manual.blocks.length;
 assert.deepEqual(view.blocks,manual.blocks.slice(at+1,next).filter(b=>b.kind==='prose').map(b=>b.text),view.nome);
 assert.equal(view.riga,view.blocks[0]);
 // The paragraphs shown give back the blocks: the bold name of a benefit and a block continuing the one before (a column break).
 const shown=view.paragrafi.map(p=>p.lead?`${p.lead}. ${p.text}`:p.text).join(' ');
 assert.equal(shown,view.blocks.slice(1).join(' '),view.nome);
 assert.equal(view.page,manual.blocks[at].page);
}
assert.equal(getFeat('allerta').editions['2024'].paragrafi.length,3,'the column break of Allerta joined');
assert.deepEqual(getFeat('allerta').editions['2024'].paragrafi.map(p=>p.lead),[undefined,'Competenza in iniziativa','Scambio di iniziativa']);
assert.equal(getFeat('lottatore').editions['2024'].prerequisito,'4º livello o superiore, Forza o Destrezza 13 o superiore');
assert.equal(getFeat('abile').editions['2024'].prerequisito,undefined);
assert.deepEqual(splitLead('Il personaggio ottiene i seguenti benefici.'),{text:'Il personaggio ottiene i seguenti benefici.'});

// Lottatore 2014: the transcription of the SRD 5.1 Italian PDF (p. 84), with the fingerprints of the PDF and of the text.
const data2014=JSON.parse(fs.readFileSync('lib/data/srd-feats-5.1-it.json','utf8'));
assert.equal(data2014.fonte.sourceSha256,'2ef143b8abeae9558d30b405ea48e2ee9b5d700dd11cd955e6117e61cbddd3f7');
const t=data2014.talenti[0];
assert.equal(t.sourceSha256,crypto.createHash('sha256').update([...t.paragrafi,...t.elenco].join('\n')).digest('hex'));
assert.equal(t.page,84);assert.equal(t.prerequisito,'Forza 13 o superiore');
assert.deepEqual(getFeat('lottatore').editions['2014'].elenco,t.elenco);

// English names, checked on the English SRD 5.2.1 (p. 87–88) and SRD 5.1 (p. 75).
assert.deepEqual(Object.values(names['2024'].talenti),['Skilled','Savage Attacker','Alert','Magic Initiate','Ability Score Improvement','Grappler','Great Weapon Fighting','Two-Weapon Fighting','Defense','Archery','Boon of Fate','Boon of Truesight','Boon of Combat Prowess','Boon of Irresistible Offense','Boon of the Night Spirit','Boon of Spell Recall','Boon of Dimensional Travel']);
assert.deepEqual(names['2014'].talenti,{lottatore:'Grappler'});
for(const feat of feats)for(const [edition,view] of Object.entries(feat.editions))assert.equal(view.en,names[edition].talenti[feat.id],`${edition} ${feat.id}`);

// Search and sitemap: in only while «Talenti» is shown. The section starts «In arrivo».
const {DEFAULT_SECTION_STATES}=require('../lib/section-visibility.ts');
assert.equal(DEFAULT_SECTION_STATES.talenti,'in-arrivo');
const ps=require('../lib/public-sections.ts');
assert.equal(ps.sectionOfPath('/talenti/allerta'),'talenti');
assert.ok(ps.isHiddenPath('/talenti/allerta',['talenti']));
const sw=fs.readFileSync('lib/sw/service-worker.js','utf8');
assert.ok(!new RegExp(sw.match(/const PUBLIC_PAGE = \/(.*)\/;/)[1]).test('/talenti'),'never saved offline');
console.log(`Talenti: 17 del 2024 (${FEAT_CATEGORIES.join(', ')}) e Lottatore 2014, testi identici, nomi inglesi, «In arrivo» di partenza.`);
// PROMPT 54: the note at the top of /talenti, with the numbers of the data.
{
  const { featsNoteText, feats: all } = require("../lib/feats.ts");
  assert.equal(all.filter(feat => feat.editions["2024"]).length, 17);
  assert.equal(featsNoteText("2024"), "Il Grimorio pubblica solo le regole dell'SRD 5.2.1, la parte che Wizards of the Coast rilascia con licenza CC BY 4.0. Contiene 17 talenti: gli altri si trovano nel Manuale del Giocatore 2024.");
  assert.equal(featsNoteText("2014"), "Il Grimorio pubblica solo le regole dell'SRD 5.1, la parte che Wizards of the Coast rilascia con licenza CC BY 4.0. Contiene un solo talento, Lottatore: gli altri si trovano nel Manuale del Giocatore 2014.");
  const page = require("node:fs").readFileSync("app/talenti/page.tsx", "utf8");
  assert.match(page, /title="ℹ️ Perché non ci sono tutti i talenti\?" data-feats-note=\{edition\}/);
  assert.doesNotMatch(require("node:fs").readFileSync("app/talenti/[id]/page.tsx", "utf8"), /featsNoteText|data-feats-note/, "not on the sheets of the single feats");
}
