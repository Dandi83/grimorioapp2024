// «I più salvati» (PROMPT 10): stars counted per person, «No» and the administrator left out, ranking and filters.
// Run: NODE_OPTIONS=--require=./tests/register-ts.cjs node tests/favorites-count.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {createRequire}=require('node:module'),{randomUUID}=require('node:crypto'),{PGlite}=require('@electric-sql/pglite');
function load(relative,deps={}){const file=path.resolve(relative),m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(id=>deps[id]??createRequire(file)(id),m,m.exports);return m.exports;}
(async()=>{
 const events=load('lib/analytics-events.ts');
 const {parseAnalyticsInput}=events;
 const event=(name,props={})=>({event:name,id:randomUUID(),view:randomUUID(),session:randomUUID(),path:'/grimorio',test:false,source:'direct',activeSeconds:0,scrollPercent:0,...props});
 // The events: from any page with a star, only the kind and an id like the addresses.
 for(const pathName of ['/grimorio','/bestiario','/preferiti','/spell/palla-di-fuoco','/mostro/goblin','/']){
  const parsed=parseAnalyticsInput(event('favorite_add',{path:pathName,favoriteKind:'incantesimo',favoriteId:'palla-di-fuoco'}));
  assert.deepEqual([parsed.favoriteKind,parsed.favoriteId],['incantesimo','palla-di-fuoco'],pathName);
 }
 assert.equal(parseAnalyticsInput(event('favorite_remove',{favoriteKind:'mostro',favoriteId:'goblin'})).event,'favorite_remove');
 for(const bad of [{favoriteKind:'oggetto',favoriteId:'x'},{favoriteKind:'mostro'},{favoriteKind:'mostro',favoriteId:'Goblin'},{favoriteKind:'mostro',favoriteId:'../admin'},{favoriteKind:'mostro',favoriteId:'a'.repeat(121)}])
  assert.equal(parseAnalyticsInput(event('favorite_add',bad)),undefined,JSON.stringify(bad));
 assert.equal(parseAnalyticsInput(event('page_view',{favoriteKind:'mostro',favoriteId:'goblin'})).favoriteId,undefined,'only the star events carry a card');
 assert.equal(events.FAVORITES_NOTE,'Conteggio dal 28 ottobre 2026: i preferiti salvati prima non sono noti.');

 // The counts: the state of each visitor and card, never a sum of taps.
 const pg=new PGlite(),pool={query:(sql,params)=>pg.query(sql,params),connect:async()=>({query:(sql,params)=>sql.startsWith('SELECT pg_advisory_xact_lock')?pg.query('SELECT 1'):pg.query(sql,params),release(){}})};
 const analytics=load('lib/analytics.ts',{'server-only':{},'./db':{pool}});
 // As the route does: the event first (refused for an excluded device or over the limits), then the state.
 async function star(visitor,kind,id,add,test=false){
  const input=parseAnalyticsInput(event(add?'favorite_add':'favorite_remove',{favoriteKind:kind,favoriteId:id,test}));
  if(await analytics.storeAnalyticsEvent(input,visitor,{kind:kind==='incantesimo'?'spell':'monster',id,title:id}))await analytics.storeFavorite(visitor,kind,id,add,test);
 }
 const count=async(period)=>Object.fromEntries((await analytics.readFavoriteCounts(period)).map(row=>[`${row.kind}:${row.id}`,row.people]));
 const [a,b,c,d,admin,no]=[1,2,3,4,5,6].map(()=>randomUUID());
 await star(a,'incantesimo','palla-di-fuoco',true);
 await star(a,'incantesimo','palla-di-fuoco',true);
 assert.deepEqual(await count(),{'incantesimo:palla-di-fuoco':1},'the same visitor twice: counted once');
 await star(b,'incantesimo','palla-di-fuoco',true);
 await star(b,'mostro','goblin',true);
 assert.deepEqual(await count(),{'incantesimo:palla-di-fuoco':2,'mostro:goblin':1});
 await star(b,'incantesimo','palla-di-fuoco',false);
 assert.deepEqual(await count(),{'incantesimo:palla-di-fuoco':1,'mostro:goblin':1},'a removal takes the person away');
 await star(c,'mostro','goblin',false);
 await star(c,'mostro','goblin',false);
 assert.deepEqual(await count(),{'incantesimo:palla-di-fuoco':1,'mostro:goblin':1},'a removal without an addition never goes below zero');
 await star(c,'mostro','goblin',true);
 assert.equal((await count())['mostro:goblin'],2,'removed then added again: counted');
 await star(d,'incantesimo','dardo-incantato',true,true);
 assert.equal((await count())['incantesimo:dardo-incantato'],undefined,'test visits are not counted');
 // The administrator's device: excluded before or after, its stars never count.
 await analytics.excludeVisitor(admin);
 await star(admin,'incantesimo','palla-di-fuoco',true);
 assert.equal((await count())['incantesimo:palla-di-fuoco'],1,'an excluded device saves nothing');
 await star(d,'mostro','lich',true);
 assert.equal((await count())['mostro:lich'],1);
 await analytics.excludeVisitor(d);
 assert.equal((await count())['mostro:lich'],undefined,'a device excluded later loses its stars');
 // «No»: the stars of that browser are forgotten (the route calls forgetFavorites, then nothing more is sent).
 await star(no,'mostro','lich',true);
 assert.equal((await count())['mostro:lich'],1);
 await analytics.forgetFavorites(no);
 assert.equal((await count())['mostro:lich'],undefined);
 // 30 days: the stars given in the last 30 days and still there.
 await pg.query("UPDATE grimorio_favorite_saves SET added_at=now()-interval '40 days' WHERE visitor_id=$1",[a]);
 assert.deepEqual(await count('30'),{'mostro:goblin':2});
 assert.equal((await count('sempre'))['incantesimo:palla-di-fuoco'],1);
 // Another addition by the same person keeps the first day (it was already saved).
 await star(a,'incantesimo','palla-di-fuoco',true);
 assert.deepEqual(await count('30'),{'mostro:goblin':2});
 // The daily cleaning keeps the saved stars (for «Sempre»), drops the removed ones after 90 days.
 await pg.query("UPDATE grimorio_favorite_saves SET changed_at=now()-interval '100 days'");
 await analytics.purgeAnalytics();
 assert.equal((await pg.query('SELECT count(*)::int AS n FROM grimorio_favorite_saves WHERE NOT saved')).rows[0].n,0);
 assert.equal((await count('sempre'))['incantesimo:palla-di-fuoco'],1);

 // Ranking and filters.
 const {rankFavorites,rankingFilterOf,RANKING_SIZE}=load('lib/favorite-ranking.ts');
 const catalog=[
  {kind:'incantesimo',id:'palla-di-fuoco',title:'Palla di fuoco',edition:'2024',href:'/spell/palla-di-fuoco'},
  {kind:'incantesimo',id:'palla-di-fuoco-2014',title:'Palla di fuoco',edition:'2014',href:'/spell/palla-di-fuoco-2014'},
  {kind:'incantesimo',id:'sfera-elastica',title:'Sfera elastica',edition:'2024',href:'/spell/sfera-elastica'},
  {kind:'mostro',id:'goblin',title:'Goblin',edition:'2024',href:'/mostro/goblin'},
  {kind:'mostro',id:'orco-2014',title:'Orco',edition:'2014',href:'/mostro/orco-2014'},
 ];
 const counts=[{kind:'mostro',id:'goblin',people:5},{kind:'incantesimo',id:'palla-di-fuoco',people:5},{kind:'incantesimo',id:'palla-di-fuoco-2014',people:2},{kind:'mostro',id:'orco-2014',people:3},{kind:'incantesimo',id:'sfera-elastica',people:0},{kind:'incantesimo',id:'carta-sparita',people:9}];
 const ids=filter=>rankFavorites(counts,catalog,filter).map(row=>`${row.id}:${row.people}`);
 assert.deepEqual(ids({kind:'tutti',edition:'tutte'}),['goblin:5','palla-di-fuoco:5','orco-2014:3','palla-di-fuoco-2014:2'],'most saved first, then by name; no zero, no card outside the catalog');
 assert.deepEqual(ids({kind:'incantesimo',edition:'tutte'}),['palla-di-fuoco:5','palla-di-fuoco-2014:2']);
 assert.deepEqual(ids({kind:'mostro',edition:'2014'}),['orco-2014:3']);
 assert.deepEqual(ids({kind:'tutti',edition:'2024'}),['goblin:5','palla-di-fuoco:5']);
 const many=Array.from({length:30},(_,i)=>({kind:'mostro',id:`m${i}`,title:`M${String(i).padStart(2,'0')}`,edition:'2024',href:''}));
 assert.equal(rankFavorites(many.map((card,i)=>({kind:'mostro',id:card.id,people:i+1})),many,{kind:'tutti',edition:'tutte'}).length,RANKING_SIZE);
 assert.equal(RANKING_SIZE,20);
 assert.deepEqual(rankingFilterOf({}),{kind:'tutti',edition:'tutte',period:'sempre'});
 assert.deepEqual(rankingFilterOf({salvati_tipo:'mostro',salvati_edizione:'2014',salvati_periodo:'30'}),{kind:'mostro',edition:'2014',period:'30'});
 assert.deepEqual(rankingFilterOf({salvati_tipo:'x',salvati_edizione:'1999',salvati_periodo:'7'}),{kind:'tutti',edition:'tutte',period:'sempre'});

 // The route: the stars on the address id (PROMPT 8), only for cards of the catalog; «No» forgets them.
 const {NextRequest}=require('next/server');
 const saved=[],forgotten=[];let admin2=false;
 const fakeAnalytics={admitEvent:async()=>true,analyticsAddressKey:()=>'k',analyticsConfigured:()=>true,analyticsSecret:()=>'s',
  storeAnalyticsEvent:async()=>true,storeRating:async()=>true,excludeVisitor:async()=>{},isVisitorExcluded:async()=>false,
  storeFavorite:async(visitor,kind,id,add)=>{saved.push([kind,id,add])},forgetFavorites:async visitor=>{forgotten.push(visitor)}};
 const exclusion=load('lib/analytics-exclusion.ts',{'server-only':{},'@/lib/analytics':fakeAnalytics,'./analytics':fakeAnalytics});
 const spells={'sfera-elastica-di-0tiluke':{id:'sfera-elastica-di-0tiluke',nome_italiano:'SFERA ELASTICA DI 0TILUKE'},'i-re-spirare-sott-acqua-2':{id:'i-re-spirare-sott-acqua-2',nome_italiano:"RESPIRARE SOTT'ACQUA"},'palla-di-fuoco':{id:'palla-di-fuoco',nome_italiano:'PALLA DI FUOCO'}};
 const publicIds=load('lib/spell-public-id.ts');
 const route=load('app/api/analytics/route.ts',{'@/lib/homebrew':{getHomebrew:async()=>undefined},'@/lib/table-votes':{storeTableVote:async()=>false},'@/lib/admin-auth':{isAdmin:async()=>admin2},'@/lib/analytics':fakeAnalytics,'@/lib/analytics-exclusion':exclusion,'@/lib/analytics-events':{parseAnalyticsInput},
  '@/lib/admin-login-limit':{clientAddress:()=>'1.2.3.4'},'@/lib/spells':{getSpellById:async id=>spells[publicIds.storedSpellId(id)]},'@/lib/monsters':{getMonsterById:async id=>id==='goblin'?{id:'goblin',nome:'Goblin'}:undefined},
  '@/lib/monsters-types':{isSrdAnimal:()=>false},'@/lib/spell-name':{spellName:name=>name},'@/lib/monster-id-aliases':load('lib/monster-id-aliases.ts'),'@/lib/spell-public-id':publicIds});
 process.env.ANALYTICS_SECRET='analytics-only-secret';
 const request=(body,cookie='')=>new NextRequest('https://ilgrimorio.app/api/analytics',{method:'POST',headers:{origin:'https://ilgrimorio.app','content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(body)});
 const first=await route.POST(request(event('favorite_add',{favoriteKind:'incantesimo',favoriteId:'sfera-elastica-di-0tiluke'})));
 assert.equal((await first.json()).stored,true);
 const visitorCookie=`grimorio_statistics_visitor=${first.cookies.get('grimorio_statistics_visitor').value}`;
 await route.POST(request(event('favorite_add',{favoriteKind:'incantesimo',favoriteId:'i-re-spirare-sott-acqua'}),visitorCookie));
 await route.POST(request(event('favorite_remove',{favoriteKind:'mostro',favoriteId:'goblin'}),visitorCookie));
 assert.deepEqual(await (await route.POST(request(event('favorite_add',{favoriteKind:'mostro',favoriteId:'inventato'}),visitorCookie))).json(),{ignored:true},'a card outside the catalog is not counted');
 assert.deepEqual(saved,[['incantesimo','sfera-elastica',true],['incantesimo','respirare-sott-acqua',true],['mostro','goblin',false]],'stored ids and merged duplicates counted on the new address');
 admin2=true;
 assert.equal((await (await route.POST(request(event('favorite_add',{favoriteKind:'incantesimo',favoriteId:'palla-di-fuoco'}),visitorCookie))).json()).reason,'admin');
 admin2=false;
 const no2=await route.POST(request({consent:'rejected'},visitorCookie));
 assert.equal(no2.status,200);assert.equal(forgotten.length,1,'«No» forgets the stars of the browser');
 assert.equal((await (await route.POST(request(event('favorite_add',{favoriteKind:'incantesimo',favoriteId:'palla-di-fuoco'}),`grimorio_statistics_consent=rejected; ${visitorCookie}`))).json()).reason,'rejected');
 assert.equal(saved.length,3,'after «No» and for the administrator nothing is saved');

 // Admin only: the counts never reach a public page, the service worker or /api/catalogo/*.
 for(const file of ['app/api/catalogo/incantesimi/route.ts','app/api/catalogo/bestiario/route.ts','lib/sw/service-worker.js','lib/search-index.ts'])
  assert.ok(!/readFavoriteCounts|grimorio_favorite_saves/.test(fs.readFileSync(file,'utf8')),file);
 for(const file of ['app/admin/statistiche/page.tsx','lib/admin-lists.ts'])assert.match(fs.readFileSync(file,'utf8'),/readFavoriteCounts/);
 assert.match(fs.readFileSync('app/privacy/page.tsx','utf8'),/Contiamo in forma anonima quante persone salvano ogni scheda nei preferiti/);
 console.log('Favorites: one person per card (adds, removals, never below zero), «No», administrator and tests left out, 30 days / Sempre, ranking of 20 with filters, new addresses, admin only.');
})().catch(error=>{console.error(error);process.exit(1);});
