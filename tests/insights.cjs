// «Approfondimenti» of /admin/statistiche (PROMPT 31): the path, the weeks of «Chi resta davvero», the arrivals from the
// link of the bio and from Instagram, why a search found nothing, the synonyms in the public index.
// Run: NODE_OPTIONS=--require=./tests/register-ts.cjs node tests/insights.cjs
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const s=require('../lib/analytics-stats.ts');
const {parseAnalyticsInput}=require('../lib/analytics-events.ts');
const {classifySearch,withSynonyms}=require('../lib/search-insights.ts');
const {rowsOf,search}=require('../lib/search.ts');

// The path: the share of the arrivals at each step and the largest drop between two following steps.
const path=s.funnel({arrivano:200,scheda:120,cercano:90,preferito:18,installano:9,tornano:40});
assert.deepEqual(path.rows.map(row=>row.percent),[100,60,45,9,5,20]);
assert.deepEqual(path.rows.map(row=>row.label),['Arrivano','Aprono una scheda','Cercano o filtrano','Salvano un preferito','Installano l’app','Tornano entro 7 giorni']);
assert.deepEqual(path.drop,{from:'Cercano o filtrano',to:'Salvano un preferito',percent:80});
assert.equal(s.funnel({arrivano:0,scheda:0,cercano:0,preferito:0,installano:0,tornano:0}).drop,null);
assert.equal(s.funnel({arrivano:5,scheda:5,cercano:5,preferito:5,installano:5,tornano:5}).drop,null,'no drop, no line');

// The weeks: Monday to Sunday, the last 8, Instagram and the other sources, back 1, 2, 4 weeks later; «—» for weeks not ended.
assert.equal(s.weekOf('2026-10-30'),'2026-10-26');assert.equal(s.weekOf('2026-10-26'),'2026-10-26');assert.equal(s.weekOf('2026-11-01'),'2026-10-26');
const today='2026-10-30';
const people=[
 {week:'2026-09-07',instagram:true,back:['2026-09-14','2026-10-05']},
 {week:'2026-09-07',instagram:true,back:['2026-09-21']},
 {week:'2026-09-07',instagram:false,back:[]},
 {week:'2026-10-19',instagram:true,back:['2026-10-26']},
];
const table=s.cohorts(today,people);
assert.equal(table.length,16);assert.equal(table[0].week,'2026-09-07');assert.equal(table[15].week,'2026-10-26');
const ig=table.find(row=>row.week==='2026-09-07'&&row.group==='instagram');
assert.equal(ig.people,2);assert.deepEqual(ig.after,[50,50,50]);
assert.deepEqual(table.find(row=>row.week==='2026-09-07'&&row.group==='altre').after,[0,0,0]);
// The week after 19 October is the one going on: not ended, «—».
assert.deepEqual(table.find(row=>row.week==='2026-10-19'&&row.group==='instagram').after,[null,null,null]);
// 12 October: one week later (19–25) has ended, two weeks later (26 October–1 November) has not.
assert.deepEqual(table.find(row=>row.week==='2026-10-12'&&row.group==='instagram').after,[null,null,null],'no people, nothing to say');
assert.equal(s.cohortShade(null),'transparent');assert.equal(s.cohortShade(100),'#1F6B45');assert.ok(s.cohortShade(10)!==s.cohortShade(90));

// The link of the bio: an arrival from Instagram, said with the page view only, never another value.
assert.equal(s.originOf('','?da=bio','ilgrimorio.app'),'instagram');
assert.equal(s.originOf('https://l.instagram.com/','','ilgrimorio.app'),'instagram','Instagram without the bio: «Instagram (altro)»');
assert.equal(s.originOf('','?da=amico','ilgrimorio.app'),'diretto');
assert.equal(s.BIO_LINK,'ilgrimorio.app/?da=bio');
const event=(name,props={})=>({event:name,id:randomUUID(),view:randomUUID(),session:randomUUID(),path:'/',test:false,source:'direct',activeSeconds:0,scrollPercent:0,...props});
assert.equal(parseAnalyticsInput(event('page_view',{origin:'instagram',bio:true})).bio,true);
assert.equal(parseAnalyticsInput(event('page_view',{bio:'si'})).bio,undefined);
assert.equal(parseAnalyticsInput(event('card_open',{path:'/spell/luce',bio:true})).bio,undefined,'only with the page view');
// The filters: only the groups, once each, with a page view or a search; nothing typed by the visitor.
assert.deepEqual(parseAnalyticsInput(event('page_view',{filters:['livello','scuola','livello','<script>','Fuoco']})).filters,['livello','scuola']);
assert.equal(parseAnalyticsInput(event('page_view',{filters:'livello'})).filters,undefined);
assert.equal(parseAnalyticsInput(event('page_view',{filters:['tutto']})).filters,undefined);
assert.equal(parseAnalyticsInput(event('filter_apply')),undefined,'never sent by the browser: written by the server');
// The search: where it was typed, only the three places.
assert.equal(parseAnalyticsInput(event('search',{query:'Drago',results:0,area:'bestiario'})).area,'bestiario');
assert.equal(parseAnalyticsInput(event('search',{query:'Drago',results:0,area:'altrove'})).area,undefined);
assert.deepEqual(parseAnalyticsInput(event('search',{query:'drago',results:2,filters:['gs']})).filters,['gs']);

// Why a search found nothing.
const index=(sections,rows)=>({v:1,sections:sections.map(k=>({k,t:k[0].toUpperCase()+k.slice(1)})),rows});
const full=index(['incantesimi','mostri','classi'],[
 [0,'Palla di fuoco','Invocazione · liv. 3','/spell/palla-di-fuoco'],
 [0,'Dardo incantato','Invocazione · liv. 1','/spell/dardo'],
 [0,'Fulmine','Invocazione · liv. 3','/spell/fulmine-2014','','2014'],
 [0,'Parola divina','Invocazione · liv. 7','/spell/parola-2024','','2024'],
 [1,'Beholder','Aberrazione · GS 13','/mostro/beholder'],
 [1,'Orco','Gigante · GS 2','/mostro/orco'],
 [2,'Druido','Classe · d8','/classi/druido'],
]);
const pub=index(['incantesimi','mostri'],full.rows.filter(row=>!['/mostro/beholder','/classi/druido'].includes(row[3])).map(row=>row[3].startsWith('/mostro')?[1,...row.slice(1)]:row));
const world={publicIndex:pub,fullIndex:full,hiddenNoSrd:['/mostro/beholder'],closedTitles:['Classi']};
const reason=q=>s.reasonLabel(classifySearch(q,world));
assert.equal(reason('beholder'),'mostro non SRD');
assert.equal(reason('druido'),'sezione in arrivo');
assert.equal(reason('classi'),'sezione in arrivo');
assert.equal(reason('fulmine'),'manca in 2024');
assert.equal(reason('parola divina'),'manca in 2014');
assert.equal(reason('pala di foco'),'errore? → Palla di fuoco');
assert.equal(reason('xyzzy qwerty'),'');
assert.equal(s.reasonLabel(null),'');

// A synonym of the reserved area: the word finds the card, shown with its own name, once, nothing marked in the name.
const withSyn=withSynonyms(pub,[{query:'fireball',href:'/spell/palla-di-fuoco'},{query:'non esiste',href:'/spell/nessuna'}]);
assert.deepEqual(withSyn.syn,[['fireball',0]]);
assert.equal(withSynonyms(pub,[]),pub,'no synonyms: the same index');
const found=search(withSyn,rowsOf(withSyn),'fireball').flatMap(group=>group.rows);
assert.equal(found.length,1);assert.equal(found[0].nome,'Palla di fuoco');assert.equal(found[0].href,'/spell/palla-di-fuoco');assert.equal(found[0].start,-1);
assert.equal(search(withSyn,rowsOf(withSyn),'palla').flatMap(group=>group.rows).filter(row=>row.href==='/spell/palla-di-fuoco').length,1,'found by its name: once');
console.log('Approfondimenti: percorso e calo più grande, settimane di chi resta, link in bio e Instagram (altro), filtri e sezioni delle ricerche, motivi delle ricerche senza risultato, sinonimi nell\'indice.');
