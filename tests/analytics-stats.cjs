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
// «Ultime 24 ore» (PROMPT 30): first in the menu, a moving window of 24 hours up to now, the 24 hours before.
assert.equal(s.periodOf('24h'),'24h');assert.equal(s.PERIODS['24h'],'Ultime 24 ore');
assert.deepEqual([...s.PERIOD_ORDER],['24h','7','30','90','instagram']);
assert.deepEqual(Object.keys(s.PERIODS).sort(),[...s.PERIOD_ORDER].sort());
{
 const w=s.hourWindow(new Date('2026-10-30T14:20:37.500Z'));
 assert.equal(w.end,'2026-10-30T14:20:00.000Z');assert.equal(w.start,'2026-10-29T14:20:00.000Z');
 assert.equal(w.prevEnd,w.start);assert.equal(w.prevStart,'2026-10-28T14:20:00.000Z');
 assert.equal(Date.parse(w.end)-Date.parse(w.start),864e5);assert.equal(Date.parse(w.prevEnd)-Date.parse(w.prevStart),864e5);
 assert.equal(w.bars.length,24);assert.equal(w.bars[0],w.start);assert.equal(w.bars[23],'2026-10-30T13:20:00.000Z');
 // The edges: the start is in the first bar, the last minute in the last one, the end and before the start outside.
 assert.equal(s.barOf(w,Date.parse(w.start)),0);assert.equal(s.barOf(w,Date.parse(w.end)-1),23);
 assert.equal(s.barOf(w,Date.parse(w.end)),-1);assert.equal(s.barOf(w,Date.parse(w.start)-1),-1);
 assert.equal(s.barOf(w,Date.parse('2026-10-30T05:19:59Z')),14);assert.equal(s.barOf(w,Date.parse('2026-10-30T05:20:00Z')),15);
 // Rome after the summer time (UTC+1): 15:20–16:20 yesterday … 14:20–15:20 today.
 const labels=s.hourLabels(w.bars);assert.equal(labels[0],'15:20–16:20');assert.equal(labels[23],'14:20–15:20');
 // The bars, the best hour (the first of the highest), «nessuna» without people.
 const bars=s.fillHours(w,[{day:0,visitors:2},{day:15,visitors:5},{day:'23',visitors:5}]);
 assert.equal(bars.length,24);assert.equal(bars.reduce((sum,row)=>sum+row.visitors,0),12);
 assert.deepEqual(s.bestHour(bars),{hour:'2026-10-30T05:20:00.000Z',label:'06:20–07:20',visitors:5});
 assert.equal(s.bestHour(s.fillHours(w,[])),null);
 // On the hour: the labels of the example, «15:00–16:00».
 assert.equal(s.hourLabels(s.hourWindow(new Date('2026-10-30T15:00:00Z')).bars)[23],'15:00–16:00');
}
// The night the clock goes back (25 October 2026): 24 real hours, two bars «02:00–03:00» told apart.
{
 const w=s.hourWindow(new Date('2026-10-25T12:00:00Z')),labels=s.hourLabels(w.bars);
 assert.equal(w.bars.length,24);assert.equal(new Set(labels).size,24);
 assert.ok(labels.includes('02:00–03:00 (ora legale)')&&labels.includes('02:00–03:00 (ora solare)'),labels.join(' | '));
 assert.equal(labels[0],'14:00–15:00');assert.equal(labels[23],'12:00–13:00');
}
// The night the clock goes forward (28 March 2027): the bar from 01:00 ends at 03:00, no 02:00.
{
 const labels=s.hourLabels(s.hourWindow(new Date('2027-03-28T12:00:00Z')).bars);
 assert.ok(labels.includes('01:00–03:00'),labels.join(' | '));assert.ok(!labels.some(label=>label.startsWith('02:')));
}
// The comparison with the 24 hours before: the same rule of the arrow.
assert.equal(s.percentChange(12,8),50);assert.equal(s.percentChange(3,0),null);
assert.equal(s.summarySentence('24h',5,25,1),'Nelle ultime 24 ore 5 persone hanno usato il Grimorio: +25% rispetto alle 24 ore prima.');
// The marked events on the hours: their hour (Rome), else the moment saved that day, else the start of the day.
assert.equal(s.markerTime({giorno:'2026-10-30',ora:15}),Date.parse('2026-10-30T14:00:00Z'));
assert.equal(s.markerTime({giorno:'2026-07-01',ora:15}),Date.parse('2026-07-01T13:00:00Z'));
assert.equal(s.markerTime({giorno:'2026-10-25',ora:2}),Date.parse('2026-10-25T00:00:00Z'),'the first 02:00 of the night it repeats');
assert.equal(s.markerTime({giorno:'2026-10-30',ora:null,creato_il:'2026-10-30T09:12:00Z'}),Date.parse('2026-10-30T09:12:00Z'));
assert.equal(s.markerTime({giorno:'2026-10-29',ora:null,creato_il:'2026-10-30T09:12:00Z'}),Date.parse('2026-10-28T23:00:00Z'));
{
 const w=s.hourWindow(new Date('2026-10-30T16:30:00Z'));
 assert.equal(s.barOf(w,s.markerTime({giorno:'2026-10-30',ora:15})),21,'«Sponsorizzata su IG» at 15:00 on the bar 14:30–15:30… of today');
 assert.equal(s.hourLabels(w.bars)[21],'14:30–15:30');
}
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
// «Usano l’app» (PROMPT 17): Android with the computers, iPhone, «altro»; always the people of the big number.
for (const [devices,people,expected] of [
  [{iphone:2,android:3,computer:0,altro:0},5,{android:3,iphone:2,altro:0,androidLabel:'Android'}],
  [{iphone:1,android:1,computer:2,altro:1},6,{android:3,iphone:1,altro:2,androidLabel:'Android e computer'}],
  [{},4,{android:0,iphone:0,altro:4,androidLabel:'Android'}],
  [{iphone:0,android:0,computer:0,altro:0},0,{android:0,iphone:0,altro:0,androidLabel:'Android'}],
]) {
  const split=s.appSplit(devices,people);
  assert.deepEqual(split,expected);
  assert.equal(split.android+split.iphone+split.altro,people,'the segments add up to the big number');
}
console.log('Analytics stats: origins and devices by category only, searched words cleaned, periods and the previous ones, changes, shares, summary sentences, counted pages and new fields validated.');
