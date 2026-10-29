const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {createRequire}=require('node:module'),{randomUUID}=require('node:crypto');
function load(relative){const file=path.resolve(relative),m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(id=>id==='./analytics-stats'?load('lib/analytics-stats.ts'):createRequire(file)(id),m,m.exports);return m.exports;}
const s=load('lib/analytics-stats.ts');
const {parseAnalyticsInput,ANALYTICS_PATH}=load('lib/analytics-events.ts');

// Where they come from: the category only.
const own='ilgrimorio.app';
assert.equal(s.originOf('','?utm_source=instagram&utm_medium=social',own),'instagram');
assert.equal(s.originOf('https://l.instagram.com/?u=x','',own),'instagram');
assert.equal(s.originOf('https://www.google.it/','',own),'google');
assert.equal(s.originOf('https://www.google.com/search?q=grimorio','',own),'google');
assert.equal(s.originOf('','?ref=share',own),'condiviso');
assert.equal(s.originOf('https://web.whatsapp.com/','',own),'condiviso');
assert.equal(s.originOf('https://t.me/canale','',own),'condiviso');
assert.equal(s.originOf('','',own),'diretto');
assert.equal(s.originOf('https://ilgrimorio.app/grimorio','',own),'diretto','the site itself is not an origin');
assert.equal(s.originOf('https://www.bing.com/','',own),'altro');
assert.equal(s.originOf('non un indirizzo','',own),'diretto');
// The kind of device.
assert.equal(s.deviceOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',5),'iphone');
assert.equal(s.deviceOf('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/131 Mobile',5),'android');
assert.equal(s.deviceOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131',0),'computer');
assert.equal(s.deviceOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',0),'computer');
assert.equal(s.deviceOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',5),'altro','iPad that reports a Mac');
assert.equal(s.deviceOf('curl/8',0),'altro');
// The searched words: lower case, letters, numbers, spaces and apostrophes, 40 characters.
assert.equal(s.cleanSearchQuery('  Drago   ROSSO  '),'drago rosso');
assert.equal(s.cleanSearchQuery("Dell’Orco <script>"),"dell'orco script");
assert.equal(s.cleanSearchQuery('palla@di#fuoco!'),'palla di fuoco');
assert.equal(s.cleanSearchQuery('x'.repeat(60)).length,40);
assert.equal(s.cleanSearchQuery('a'),null);assert.equal(s.cleanSearchQuery('!!!'),null);assert.equal(s.cleanSearchQuery(42),null);
assert.equal(s.cleanSearchQuery('Àrcano 9º'),'àrcano 9º');
// Periods and the previous one of the same length.
assert.deepEqual(s.periodRange('7','2026-10-27'),{from:'2026-10-21',to:'2026-10-27',length:7,prevFrom:'2026-10-14',prevTo:'2026-10-20'});
assert.deepEqual(s.periodRange('30','2026-10-27'),{from:'2026-09-28',to:'2026-10-27',length:30,prevFrom:'2026-08-29',prevTo:'2026-09-27'});
assert.deepEqual(s.periodRange('instagram','2026-10-27'),{from:'2026-10-26',to:'2026-10-27',length:2,prevFrom:'2026-10-24',prevTo:'2026-10-25'});
assert.equal(s.periodOf('qualcosa'),'30');assert.equal(s.periodOf('instagram'),'instagram');
assert.deepEqual(s.fillDays('2026-10-25','2026-10-27',[{day:'2026-10-26',visitors:4}]).map(d=>d.visitors),[0,4,0]);
// People, returns and comparisons.
assert.equal(s.percentChange(30,20),50);assert.equal(s.percentChange(15,20),-25);assert.equal(s.percentChange(5,0),null);assert.equal(s.percentChange(0,0),null);
assert.equal(s.share(1,3),33);assert.equal(s.share(2,3),67);assert.equal(s.share(1,0),0);
assert.equal(s.signed(12),'+12%');assert.equal(s.signed(-7),'−7%');assert.equal(s.signed(0),'0%');
assert.equal(s.summarySentence('7',42,12,7),'Questa settimana 42 persone hanno usato il Grimorio: +12% rispetto alla settimana prima.');
assert.equal(s.summarySentence('30',1,null,30),'Negli ultimi 30 giorni 1 persona ha usato il Grimorio.');
assert.equal(s.summarySentence('instagram',10,-20,2),'Da quando c’è Instagram 10 persone hanno usato il Grimorio: −20% rispetto ai 2 giorni prima.');
assert.deepEqual(s.bestDay([{day:'a',visitors:2},{day:'b',visitors:5},{day:'c',visitors:5}]),{day:'b',visitors:5});
assert.equal(s.bestDay([{day:'a',visitors:0}]),null);
assert.equal(s.dayLabel('2026-10-26'),'lunedì 26 ottobre');
assert.equal(s.areaOf('/spell/luce'),'incantesimi');assert.equal(s.areaOf('/mostro/lich-2014'),'bestiario');assert.equal(s.areaOf('/equipaggiamento/armi/tridente'),'compendio');assert.equal(s.areaOf('/'),null);

// Pages counted: the new ones, with the same strict check; nothing else.
for(const ok of ['/compendio','/compendio/condizioni','/regole/concentrazione','/oggi/2026-10-27','/oggetti-magici','/oggetti-magici/anello-di-resistenza','/equipaggiamento','/equipaggiamento/armi','/equipaggiamento/armi/tridente','/info','/installa'])assert.ok(ANALYTICS_PATH.test(ok),ok);
for(const no of ['/admin','/admin/statistiche','/compendio/a/b','/regole','/info/x','/equipaggiamento/a/b/c','/oggetti-magici/Anello','/compendio/x?y=1','/installa/','/api/analytics'])assert.ok(!ANALYTICS_PATH.test(no),no);
const event=(name,props={})=>({event:name,id:randomUUID(),view:randomUUID(),session:randomUUID(),path:'/',test:false,source:'direct',activeSeconds:0,scrollPercent:0,...props});
// page_view: only known categories are kept; the rest is dropped, never stored as given.
assert.deepEqual((({origin,device,installed})=>({origin,device,installed}))(parseAnalyticsInput(event('page_view',{origin:'instagram',device:'android',installed:true}))),{origin:'instagram',device:'android',installed:true});
const odd=parseAnalyticsInput(event('page_view',{origin:'https://x.example',device:'Mozilla/5.0',installed:'si',referrer:'https://x.example',userAgent:'Mozilla'}));
assert.ok(odd);assert.equal(odd.origin,undefined);assert.equal(odd.device,undefined);assert.equal(odd.installed,undefined);assert.ok(!('referrer' in odd)&&!('userAgent' in odd));
// search: cleaned word and results; refused without them.
assert.deepEqual((({query,results})=>({query,results}))(parseAnalyticsInput(event('search',{query:'  Mente  SCHEGGIA ',results:0}))),{query:'mente scheggia',results:0});
for(const bad of [event('search',{results:2}),event('search',{query:'?',results:2}),event('search',{query:'lich',results:-1}),event('search',{query:'lich'})])assert.equal(parseAnalyticsInput(bad),undefined);
assert.equal(parseAnalyticsInput(event('card_open',{path:'/compendio'})),undefined,'card events only on cards');
// «Le schede più aperte» (PROMPT 16): the readings of one card under an old id and its current one make one line.
{
  const current=(kind,id)=>kind==='spell'?({'i-re-spirare-sott-acqua':'i-re-spirare-sott-acqua-2','sfera-elastica':'sfera-elastica-di-0tiluke'}[id]??id):id;
  const rows=[
    {kind:'spell',id:'amicizia',title:'Amicizia',opens:16},{kind:'spell',id:'amicizia-2',title:'Amicizia',opens:10},
    {kind:'spell',id:'i-re-spirare-sott-acqua',title:"Respirare sott'acqua",opens:4},{kind:'spell',id:'i-re-spirare-sott-acqua-2',title:"Respirare sott'acqua",opens:9},
    {kind:'spell',id:'sfera-elastica',title:'Sfera elastica',opens:2},{kind:'spell',id:'sfera-elastica-di-0tiluke',title:'Sfera elastica di Otiluke',opens:1},
    {kind:'monster',id:'lich',title:'Lich',opens:5},{kind:'monster',id:'lich-2014',title:'Lich',opens:5},
  ];
  const merged=s.mergeCardOpens(rows,current);
  assert.deepEqual(merged.map(row=>[row.id,row.opens]),[['amicizia',16],["i-re-spirare-sott-acqua-2",13],['amicizia-2',10],['lich',5],['lich-2014',5],['sfera-elastica-di-0tiluke',3]],
    'old + new id = one line, on the current id; two different cards with the same name stay two lines');
  assert.equal(merged.find(row=>row.id==='sfera-elastica-di-0tiluke').title,'Sfera elastica di Otiluke','the title of the current id');
  assert.equal(s.mergeCardOpens(rows,current,2).length,2);
}
console.log('Analytics stats: origins and devices by category only, searched words cleaned, periods and the previous ones, changes, shares, summary sentences, counted pages and new fields validated.');
