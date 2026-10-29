const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {createRequire}=require('node:module'),{randomUUID}=require('node:crypto'),{PGlite}=require('@electric-sql/pglite');
function load(relative,deps={}){const file=path.resolve(relative),m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(id=>deps[id]??createRequire(file)(id),m,m.exports);return m.exports;}
(async()=>{
 const {parseAnalyticsInput}=load('lib/analytics-events.ts');
 const event=(name='page_view',props={})=>({event:name,id:randomUUID(),view:randomUUID(),session:randomUUID(),path:'/mostro/gatto',test:false,source:'direct',activeSeconds:0,scrollPercent:0,...props});
 assert.ok(parseAnalyticsInput(event()));
 for(const value of [event('private_event'),event('page_view',{path:'/admin'}),event('page_view',{path:'/spell/gatto?email=private'}),event('page_view',{path:'https://elsewhere.test'}),event('card_read',{activeSeconds:19,scrollPercent:100}),event('card_read',{activeSeconds:20,scrollPercent:49}),event('card_read',{activeSeconds:Infinity,scrollPercent:100})])assert.equal(parseAnalyticsInput(value),undefined);
 assert.ok(parseAnalyticsInput(event('card_read',{activeSeconds:20,scrollPercent:50})));
 const pg=new PGlite(),pool={query:(sql,params)=>pg.query(sql,params),connect:async()=>({query:(sql,params)=>sql.startsWith('SELECT pg_advisory_xact_lock')?pg.query('SELECT 1'):pg.query(sql,params),release(){}})};
 const analytics=load('lib/analytics.ts',{'server-only':{},'./db':{pool}});
 // Reading the page creates the tables once, with the event of the Instagram opening; never again after a delete.
 const range=day=>({from:day,to:day,prevFrom:'2000-01-01',prevTo:'2000-01-01'});
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(new Date());
 const empty=await analytics.readStatistics(range(today));
 assert.equal(empty.people,0);assert.deepEqual(empty.markers.map(m=>[m.giorno,m.etichetta]),[['2026-10-26','Apertura profilo Instagram']]);
 const card={id:'gatto',kind:'animal',title:'Gatto'},a=randomUUID(),b=randomUUID(),c=randomUUID(),view=randomUUID(),session2=randomUUID();
 const input=event('page_view',{view,source:'share',origin:'instagram',device:'iphone',installed:true});
 assert.equal(await analytics.storeAnalyticsEvent(parseAnalyticsInput(input),a,card),true);
 assert.equal(await analytics.storeAnalyticsEvent({...parseAnalyticsInput(input),id:randomUUID()},a,card),false,'duplicate page view is ignored even with a new event ID');
 // a: back in a second session; b: from Google on Android; c: no category (recorded before) on the Home.
 await analytics.storeAnalyticsEvent(parseAnalyticsInput(event('page_view',{session:session2,origin:'diretto',device:'iphone',installed:true,path:'/grimorio'})),a,card);
 await analytics.storeAnalyticsEvent(parseAnalyticsInput(event('page_view',{origin:'google',device:'android',installed:false,path:'/compendio/condizioni'})),b,card);
 await analytics.storeAnalyticsEvent(parseAnalyticsInput(event('page_view',{path:'/'})),c,card);
 await analytics.storeAnalyticsEvent(event('page_view',{test:true}),randomUUID(),card);
 for(const visitor of [a,a,b])await analytics.storeAnalyticsEvent(event('card_open'),visitor,card);
 await analytics.storeAnalyticsEvent(event('card_open',{path:'/spell/allarme-2014'}),b,{id:'allarme-2014',kind:'spell',title:'Allarme'});
 // Searches: «drago rossa» twice with no result is listed, «mind» once is not, a search with results never.
 for(const [visitor,query,results] of [[a,'Drago  Rossa',0],[b,'drago rossa',0],[a,'mind',0],[b,'lich',3],[c,'lich',3]])
  await analytics.storeAnalyticsEvent(parseAnalyticsInput(event('search',{path:'/',query,results})),visitor);
 const data=await analytics.readStatistics(range(today));
 assert.equal(data.people,3,'people are different visitors, not page views');
 assert.equal(data.returning,1,'back at least a second time: two sessions');
 assert.equal(data.installed,1);
 assert.deepEqual(data.origins,{instagram:1,diretto:0,google:1,condiviso:0,altro:0},'first arrival of each person, unknown ones left out');
 assert.deepEqual(data.devices,{iphone:1,android:1,computer:0,altro:0});
 assert.deepEqual(data.areas,{incantesimi:1,bestiario:1,compendio:1});
 assert.deepEqual(data.cards.map(row=>[row.id,row.opens]),[['gatto',3],['allarme-2014',1]]);
 assert.deepEqual(data.notFound,[{query:'drago rossa',times:2}]);
 assert.equal((await analytics.readStatistics({from:'2000-01-01',to:'2000-01-02',prevFrom:today,prevTo:today})).previousPeople,3,'the previous period is counted the same way');
 // Installations: once per visitor. i1 installs from the browser and then opens the app (1 confirmed), i2 opens the
 // app from the icon twice (1 at the first opening); an excluded device saves nothing and loses what it had saved.
 const install=(name,device)=>parseAnalyticsInput(event(name,{path:'/',device}));
 assert.equal(install('app_installed','android').device,'android');
 assert.equal(parseAnalyticsInput(event('app_installed',{path:'/admin'})),undefined,'only public pages');
 const i1=randomUUID(),i2=randomUUID(),ex=randomUUID();
 assert.equal(await analytics.storeAnalyticsEvent(install('app_installed','android'),i1),true);
 assert.equal(await analytics.storeAnalyticsEvent(install('first_standalone_open','android'),i1),true);
 assert.equal(await analytics.storeAnalyticsEvent(install('first_standalone_open','iphone'),i2),true);
 assert.equal(await analytics.storeAnalyticsEvent(install('first_standalone_open','iphone'),i2),false,'a second opening from the icon is not saved');
 assert.equal(await analytics.storeAnalyticsEvent(install('app_installed','android'),i1),false,'nor a second installation of the same visitor');
 const installed=await analytics.readStatistics(range(today));
 assert.deepEqual(installed.installs,{total:2,confirmed:1,firstOpen:1},'app_installed and first_standalone_open of one visitor count 1');
 assert.equal((await analytics.readStatistics({from:'2000-01-01',to:'2000-01-02',prevFrom:today,prevTo:today})).previousInstalls,2,'compared with the period before');
 assert.equal(await analytics.storeAnalyticsEvent(parseAnalyticsInput(event('page_view',{path:'/'})),ex),true);
 await analytics.excludeVisitor(ex);
 assert.equal(await analytics.isVisitorExcluded(ex),true);
 assert.equal((await pg.query('SELECT count(*)::int AS n FROM grimorio_analytics_events WHERE visitor_id=$1',[ex])).rows[0].n,0,'its saved events are deleted');
 for(const name of ['page_view','first_standalone_open'])assert.equal(await analytics.storeAnalyticsEvent(parseAnalyticsInput(event(name,{path:'/'})),ex),false,`an excluded device saves no ${name}`);
 assert.equal((await analytics.readStatistics(range(today))).people,3,'the excluded device is not counted');
 await analytics.addMarker('2026-10-30','Post sul gruppo');
 const marked=await analytics.readStatistics(range(today));
 assert.deepEqual(marked.markers.map(m=>m.etichetta),['Apertura profilo Instagram','Post sul gruppo']);
 for(const marker of marked.markers)await analytics.deleteMarker(marker.id);
 assert.deepEqual((await analytics.readStatistics(range(today))).markers,[],'deleted events are not created again');
 // «Usano l’app» by system (PROMPT 17): the people of the big number, each once with the device of the last opening
 // of the app; a computer counts with Android, an unknown system is «altro»: the parts add up to the number.
 const appUser=async(visitor,device,installed=true)=>assert.equal(await analytics.storeAnalyticsEvent(parseAnalyticsInput(event('page_view',{path:'/',device,installed})),visitor),true);
 const [u1,u2,u3,u4]=[randomUUID(),randomUUID(),randomUUID(),randomUUID()];
 const before=await analytics.readStatistics(range(today));
 await appUser(u1,'iphone');await appUser(u1,'iphone');await appUser(u2,'computer');await appUser(u3,undefined);await appUser(u4,'android',false);
 const apps=await analytics.readStatistics(range(today));
 assert.equal(apps.installed-before.installed,3,'u4 used the site, not the app');
 assert.equal(apps.installedDevices.iphone-before.installedDevices.iphone,1);assert.equal(apps.installedDevices.computer-before.installedDevices.computer,1);
 assert.equal(apps.installedDevices.android,before.installedDevices.android);assert.equal(apps.installedDevices.altro,before.installedDevices.altro);
 const split=require('../lib/analytics-stats.ts').appSplit(apps.installedDevices,apps.installed);
 assert.equal(split.androidLabel,'Android e computer');
 assert.equal(split.android+split.iphone+split.altro,apps.installed,'the parts add up to the big number');
 // The searched words and categories only: the row keeps no referrer, address or user agent.
 const columns=(await pg.query("SELECT column_name FROM information_schema.columns WHERE table_name='grimorio_analytics_events'")).rows.map(r=>r.column_name);
 assert.ok(!columns.some(name=>/referr|agent|ip|address|url/.test(name)),columns.join());
 process.env.ADMIN_PASSCODE='test-only-secret';
 // The admin passcode is never the statistics key: without ANALYTICS_SECRET the statistics do not start.
 delete process.env.ANALYTICS_SECRET;
 {const warn=console.warn,warnings=[];console.warn=m=>warnings.push(String(m));
  assert.equal(analytics.analyticsSecret(),'');assert.equal(analytics.analyticsConfigured(),false);
  console.warn=warn;assert.deepEqual(warnings,['[statistiche] Variabile mancante: ANALYTICS_SECRET. Statistiche non attive.']);}
 // First party only (28 October 2026): running with the key alone, nothing is sent to PostHog or anywhere else.
 process.env.ANALYTICS_SECRET='analytics-only-secret';assert.equal(analytics.analyticsConfigured(),true);
 assert.equal(analytics.exportAnalytics,undefined,'no export to third parties');
 assert.ok(!fs.readFileSync('lib/analytics.ts','utf8').includes('posthog.com'),'no third-party endpoint in the statistics');
 // The Home (28 October 2026): the sharing of the whole app from any public page, with where it started; the faces.
 const home=(name,props={})=>parseAnalyticsInput(event(name,{path:'/',device:'iphone',...props}));
 assert.equal(home('share_tap',{from:'home'}).from,'home');
 assert.equal(home('share_sent',{from:'valutazione'}).from,'valutazione');
 assert.equal(home('share_cancel',{from:'home'}).from,'home');
 assert.equal(home('share_tap'),undefined,'a tap says where it started');
 assert.equal(home('share_tap',{from:'altrove'}),undefined);
 assert.equal(home('share_cancel'),undefined,'the cards keep their own share events, on their pages');
 assert.equal(home('valutazione',{vote:'bene'}).vote,'bene');
 assert.equal(home('valutazione',{vote:'ottimo'}),undefined,'only the three faces');
 assert.equal(home('arrivo_da_amico').from,undefined);
 // Different people: f1 taps from the Home twice and sends, f2 taps after the vote and cancels, f3 arrives twice.
 const f1=randomUUID(),f2=randomUUID(),f3=randomUUID();
 for(const [input,visitor] of [[home('share_tap',{from:'home'}),f1],[home('share_tap',{from:'home'}),f1],[home('share_sent',{from:'home'}),f1],[home('share_tap',{from:'valutazione'}),f2],[home('share_cancel',{from:'valutazione'}),f2]])
  assert.equal(await analytics.storeAnalyticsEvent(input,visitor),true);
 assert.equal(await analytics.storeAnalyticsEvent(home('arrivo_da_amico'),f3),true);
 assert.equal(await analytics.storeAnalyticsEvent(home('arrivo_da_amico'),f3),false,'a friend arrival counts once per visitor');
 const word=await analytics.readWordOfMouth('30');
 assert.deepEqual({tapped:word.tapped,fromHome:word.fromHome,fromRating:word.fromRating,sent:word.sent,arrived:word.arrived},{tapped:2,fromHome:1,fromRating:1,sent:1,arrived:1});
 assert.equal(word.weeks.reduce((sum,row)=>sum+row.part,0),1);
 // Votes: one per visitor every 4 months, never from an excluded device; the table keeps no visitor ID.
 const v1=randomUUID(),v2=randomUUID();
 assert.equal(await analytics.storeRating('bene',v1,'iphone',false),true);
 assert.equal(await analytics.storeRating('male',v1,'iphone',false),false,'a second vote within 4 months is refused');
 assert.equal(await analytics.storeRating('cosi-cosi',v2,'computer',false),true);
 assert.equal(await analytics.storeRating('bene',ex,'android',false),false,'an excluded device does not vote');
 assert.equal(await analytics.storeRating('bene',randomUUID(),'android',true),true,'a test vote is saved…');
 let votes=await analytics.readRatings('sempre');
 assert.deepEqual({total:votes.total,bene:votes.bene,cosiCosi:votes.cosiCosi,male:votes.male},{total:2,bene:1,cosiCosi:1,male:0},'…but not counted');
 const ratingColumns=(await pg.query("SELECT column_name FROM information_schema.columns WHERE table_name='grimorio_ratings'")).rows.map(r=>r.column_name).sort();
 assert.deepEqual(ratingColumns,['chiave','creato_il','device','id','is_test','voto']);
 assert.equal((await pg.query('SELECT count(*)::int AS n FROM grimorio_ratings WHERE chiave=$1',[v1])).rows[0].n,0,'the key is not the visitor ID');
 // After 4 months the key is emptied and the same visitor may vote again; the old vote stays in «Sempre».
 await pg.query("UPDATE grimorio_ratings SET creato_il=now()-interval '5 months'");
 assert.equal(await analytics.storeRating('male',v1,'iphone',false),true);
 assert.equal((await pg.query('SELECT count(*)::int AS n FROM grimorio_ratings WHERE chiave IS NOT NULL')).rows[0].n,1);
 votes=await analytics.readRatings('sempre');assert.equal(votes.total,3);
 assert.equal((await analytics.readRatings('30')).total,1,'the period counts only its answers');
 // Limits per network address (28 October 2026): a hash that changes every day, never the address.
 const L=analytics.ANALYTICS_LIMITS;
 const keyToday=analytics.analyticsAddressKey('203.0.113.7','2026-10-28');
 assert.match(keyToday,/^[0-9a-f]{64}$/);assert.ok(!keyToday.includes('203.0.113.7'));
 assert.notEqual(keyToday,analytics.analyticsAddressKey('203.0.113.7','2026-10-29'),'the hash changes every day');
 assert.equal(keyToday,analytics.analyticsAddressKey('203.0.113.7','2026-10-28'));
 // New visitors without the cookie: only a few an hour from one address.
 const net=analytics.analyticsAddressKey('198.51.100.1');
 for(let i=0;i<L.newVisitorsPerAddressPerHour;i++)assert.equal(await analytics.admitEvent(net,true),true);
 assert.equal(await analytics.admitEvent(net,true),false,'one more new visitor from the same address is dropped');
 assert.equal(await analytics.admitEvent(net,false),true,'a known visitor of that address is still counted');
 assert.equal(await analytics.admitEvent(analytics.analyticsAddressKey('198.51.100.2'),true),true,'another address is not affected');
 // Events of one address in a minute.
 const busy=analytics.analyticsAddressKey('198.51.100.3');
 await pg.query(`INSERT INTO grimorio_analytics_limits (address_key) SELECT $1 FROM generate_series(1,$2)`,[busy,L.perAddressPerMinute]);
 assert.equal(await analytics.admitEvent(busy,false),false,'over the events of one address in a minute');
 await pg.query("UPDATE grimorio_analytics_limits SET at=now()-interval '2 minutes' WHERE address_key=$1",[busy]);
 assert.equal(await analytics.admitEvent(busy,false),true,'a minute later it counts again');
 // The whole site in a minute: over the ceiling every event is dropped in silence.
 await pg.query(`INSERT INTO grimorio_analytics_limits (address_key) SELECT 'riempimento-'||n FROM generate_series(1,$1) AS n`,[L.overallPerMinute]);
 assert.equal(await analytics.admitEvent(analytics.analyticsAddressKey('198.51.100.4'),false),false,'over the ceiling of the site');
 await pg.query("UPDATE grimorio_analytics_limits SET at=now()-interval '2 days'");
 assert.equal(await analytics.admitEvent(analytics.analyticsAddressKey('198.51.100.4'),false),true);
 // The daily cleaning: limits after one day, votes after 13 months, events after 90 days.
 await pg.query("INSERT INTO grimorio_ratings (id,voto,creato_il) VALUES ($1,'bene',now()-interval '14 months'),($2,'male',now()-interval '12 months')",[randomUUID(),randomUUID()]);
 await analytics.purgeAnalytics();
 assert.equal((await pg.query("SELECT count(*)::int AS n FROM grimorio_analytics_limits WHERE at<now()-interval '1 day'")).rows[0].n,0,'the hashes of the limits last one day');
 assert.equal((await pg.query("SELECT count(*)::int AS n FROM grimorio_ratings WHERE creato_il<now()-interval '13 months'")).rows[0].n,0,'votes older than 13 months are deleted');
 assert.equal((await pg.query("SELECT count(*)::int AS n FROM grimorio_ratings WHERE creato_il<now()-interval '11 months'")).rows[0].n,1,'a vote of 12 months ago stays');
 await pg.query("UPDATE grimorio_analytics_events SET received_at=now()-interval '91 days'");await analytics.purgeAnalytics();assert.equal((await pg.query('SELECT count(*)::int AS n FROM grimorio_analytics_events')).rows[0].n,0);
 let admin=false,stored=0;const afterCallbacks=[],excludedIds=new Set();
 const {NextRequest}=require('next/server');
 let votesSaved=[];let admitted=true;const fakeAnalytics={admitEvent:async()=>admitted,analyticsAddressKey:address=>`key:${address}`,storeRating:async(vote,visitor,device,test)=>{votesSaved.push({vote,device,test});return true},analyticsConfigured:()=>true,analyticsSecret:()=>process.env.ANALYTICS_SECRET||'',storeAnalyticsEvent:async()=>{stored++;return true},excludeVisitor:async id=>{excludedIds.add(id)},isVisitorExcluded:async id=>excludedIds.has(id),storeFavorite:async()=>{},forgetFavorites:async()=>{}};
 const exclusion=load('lib/analytics-exclusion.ts',{'server-only':{},'next/headers':{cookies:async()=>({get:()=>undefined,set(){}})},'./analytics':fakeAnalytics});
 const route=load('app/api/analytics/route.ts',{'next/server':{...require('next/server'),after:fn=>afterCallbacks.push(fn)},'@/lib/admin-auth':{isAdmin:async()=>admin},'@/lib/analytics':fakeAnalytics,'@/lib/analytics-exclusion':exclusion,'@/lib/analytics-events':{parseAnalyticsInput},'@/lib/admin-login-limit':{clientAddress:headers=>headers.get('x-real-ip')},'@/lib/spells':{getSpellById:async()=>({nome_italiano:'Test'})},'@/lib/monsters':{getMonsterById:async()=>({id:'gatto',nome:'Gatto'})},'@/lib/monsters-types':{isSrdAnimal:()=>true},'@/lib/spell-name':{spellName:name=>name}});
 process.env.ANALYTICS_SECRET='analytics-only-secret';
 const request=(body,headers={})=>new NextRequest('https://ilgrimorio.app/api/analytics',{method:'POST',headers:{origin:'https://ilgrimorio.app','content-type':'application/json',...headers},body:JSON.stringify(body)});
 assert.equal((await route.POST(request(event(),{origin:'https://bad.example'}))).status,403);
 // Counted by default (28 October 2026): the first event of a new browser is saved and gives it a random visitor ID.
 const first=await route.POST(request(event()));
 assert.equal((await first.json()).stored,true);assert.equal(stored,1);
 const firstVisitor=first.cookies.get('grimorio_statistics_visitor');
 assert.match(firstVisitor.value,/^[0-9a-f-]{36}\.[0-9a-f]{64}$/);assert.equal(firstVisitor.maxAge,180*24*3600,'the visitor cookie lasts 180 days, under the 13 months');
 const consent=await route.POST(request({consent:'accepted'}));
 const choice=consent.cookies.get('grimorio_statistics_consent');assert.equal(choice.value,'accepted');assert.equal(choice.maxAge,395*24*3600,'the answer lasts 13 months');
 const visitorCookie=consent.cookies.get('grimorio_statistics_visitor').value;
 const cookies=`grimorio_statistics_consent=accepted; grimorio_statistics_visitor=${visitorCookie}`;
 const counted=await route.POST(request(event(),{cookie:cookies}));
 assert.equal((await counted.json()).stored,true);assert.equal(stored,2);assert.equal(counted.cookies.get('grimorio_statistics_visitor'),undefined,'a known visitor keeps its ID');
 admin=true;assert.equal((await (await route.POST(request(event(),{cookie:cookies}))).json()).reason,'admin');assert.equal(stored,2);admin=false;
 const forged=await route.POST(request(event(),{cookie:'grimorio_statistics_visitor=forged'}));
 assert.notEqual(forged.cookies.get('grimorio_statistics_visitor').value.split('.')[0],'forged','a cookie that does not verify is a new visitor');
 // «No»: nothing saved any more, the ID removed; also for those who refused before (the same cookie value).
 const storedBeforeNo=stored;
 const revoked=await route.POST(request({consent:'rejected'},{cookie:cookies}));assert.equal(revoked.cookies.get('grimorio_statistics_visitor').maxAge,0);
 assert.equal(revoked.cookies.get('grimorio_statistics_consent').value,'rejected');
 for(const cookie of ['grimorio_statistics_consent=rejected',`grimorio_statistics_consent=rejected; grimorio_statistics_visitor=${visitorCookie}`]){
  const refusedEvent=await route.POST(request(event(),{cookie}));
  assert.equal((await refusedEvent.json()).reason,'rejected');assert.equal(refusedEvent.cookies.get('grimorio_statistics_visitor'),undefined);
 }
 assert.equal(stored,storedBeforeNo,'after «No» no event is saved');
 // Only ANALYTICS_SECRET signs: a cookie signed with the admin passcode (the old «legacy» cookies) is a new visitor.
 const {createHmac}=require('node:crypto');
 const oldId='0f8fad5b-d9cb-469f-a165-70867728950e';
 const byPasscode=`grimorio_statistics_consent=accepted; grimorio_statistics_visitor=${oldId}.${createHmac('sha256',process.env.ADMIN_PASSCODE).update(`statistics:${oldId}`).digest('hex')}`;
 const refused=await route.POST(request(event(),{cookie:byPasscode}));
 await refused.json();assert.notEqual(refused.cookies.get('grimorio_statistics_visitor').value.split('.')[0],oldId,'a passcode-signed cookie is not accepted, never re-signed: a new ID');
 const renewed=await route.POST(request({consent:'accepted'},{cookie:byPasscode}));
 assert.notEqual(renewed.cookies.get('grimorio_statistics_visitor').value.split('.')[0],oldId,'accepting again gives a new visitor ID');
 process.env.ADMIN_PASSCODE='passcode-changed';
 assert.equal((await (await route.POST(request(event(),{cookie:cookies}))).json()).stored,true,'changing the admin passcode does not reset visitors');
 process.env.ADMIN_PASSCODE='test-only-secret';
 // A face of the Home: saved by storeRating (its own table), never as an event; nothing after «No» or for the admin.
 const storedBeforeVote=stored;
 const voted=await route.POST(request(event('valutazione',{path:'/',vote:'bene',device:'iphone'}),{cookie:cookies}));
 assert.equal((await voted.json()).stored,true);assert.deepEqual(votesSaved,[{vote:'bene',device:'iphone',test:false}]);assert.equal(stored,storedBeforeVote);
 assert.equal((await (await route.POST(request(event('valutazione',{path:'/',vote:'bene'}),{cookie:'grimorio_statistics_consent=rejected'}))).json()).reason,'rejected');
 admin=true;assert.equal((await (await route.POST(request(event('valutazione',{path:'/',vote:'male'}),{cookie:cookies}))).json()).reason,'admin');admin=false;
 assert.equal(votesSaved.length,1,'no vote after «No» nor from the administrator');
 // /avanzamento and /termini were refused with 400 until 28 October 2026 (tests/analytics-pages.cjs checks every page).
 for(const path of ['/avanzamento','/termini','/segnala','/in-arrivo/bestiario','/classi/mago','/dadi']){
  const counted=await route.POST(request(event('page_view',{path}),{cookie:cookies}));
  assert.equal(counted.status,200,path);assert.equal((await counted.json()).stored,true,path);
 }
 // Over a limit (lib/analytics.ts, admitEvent): nothing saved, no new visitor ID, no error for the visitor.
 admitted=false;
 const storedBeforeLimit=stored;
 const dropped=await route.POST(request(event()));
 assert.equal(dropped.status,200);assert.deepEqual(await dropped.json(),{ok:true,stored:false});
 assert.equal(dropped.cookies.get('grimorio_statistics_visitor'),undefined,'no visitor is made up');
 assert.equal((await (await route.POST(request(event(),{cookie:cookies}))).json()).stored,false);
 assert.equal(stored,storedBeforeLimit);
 assert.equal((await route.GET(new NextRequest('https://ilgrimorio.app/api/analytics'))).cookies.get('grimorio_statistics_visitor'),undefined,'the status gives no new ID over the limit');
 admitted=true;
 // A malformed escape in a card path is a bad request, not a server failure.
 const storedBefore=stored;
 const badPath=await route.POST(request(event('card_open',{path:'/spell/%E0%A4%A'}),{cookie:cookies}));
 assert.equal(badPath.status,400);assert.equal(stored,storedBefore,'nothing is stored for a malformed path');
 // GET tells the banner whether statistics run here, whether this is an admin, and the saved choice.
 const status=async(url,cookie)=>(await route.GET(new NextRequest(url,{headers:cookie?{cookie}:{}}))).json();
 assert.deepEqual(await status('https://ilgrimorio.app/api/analytics'),{enabled:true,excluded:false,consent:null});
 assert.deepEqual(await status('https://ilgrimorio.app/api/analytics','grimorio_statistics_consent=rejected'),{enabled:true,excluded:false,consent:'rejected'});
 // The status gives a new browser its visitor ID before the first events (they share it); never after «No».
 const fresh=await route.GET(new NextRequest('https://ilgrimorio.app/api/analytics'));
 assert.match(fresh.cookies.get('grimorio_statistics_visitor').value,/^[0-9a-f-]{36}\./);
 const no=await route.GET(new NextRequest('https://ilgrimorio.app/api/analytics',{headers:{cookie:'grimorio_statistics_consent=rejected'}}));
 assert.equal(no.cookies.get('grimorio_statistics_visitor'),undefined);
 assert.equal(no.cookies.get('grimorio_statistics_consent').maxAge,395*24*3600,'«No» renewed at every visit, 13 months');
 assert.equal((await route.GET(new NextRequest('https://anteprima.example.vercel.app/api/analytics'))).cookies.get('grimorio_statistics_visitor'),undefined,'no ID where nothing is collected');
 assert.equal((await status('https://ilgrimorio.app/api/analytics','grimorio_statistics_consent=altro')).consent,null,'unknown choices are ignored');
 assert.equal((await status('https://anteprima.example.vercel.app/api/analytics')).enabled,false,'previews and other hosts never collect');
 admin=true;assert.equal((await status('https://ilgrimorio.app/api/analytics')).excluded,true,'administrators are excluded');
 // The device of a login stays excluded after the logout: GET marks it with a long cookie, renewed at every visit.
 const markedDevice=await route.GET(new NextRequest('https://ilgrimorio.app/api/analytics'));admin=false;
 const mark=markedDevice.cookies.get('grimorio_statistics_excluded');
 assert.equal(mark.value,'1');assert.equal(mark.maxAge,400*24*3600);assert.equal(mark.httpOnly,true);
 const excludedCookies=`${cookies}; grimorio_statistics_excluded=1`;
 assert.equal((await status('https://ilgrimorio.app/api/analytics','grimorio_statistics_excluded=1')).excluded,true,'excluded after the logout');
 const storedBeforeExclusion=stored;
 assert.equal((await (await route.POST(request(event(),{cookie:excludedCookies}))).json()).reason,'admin');
 // Without the cookie (lost, or another storage) a visitor ID marked before is refused too.
 excludedIds.add(visitorCookie.split('.')[0]);
 assert.equal((await (await route.POST(request(event(),{cookie:cookies}))).json()).reason,'admin');
 assert.equal(stored,storedBeforeExclusion,'an excluded device saves no event');
 // Accepting the statistics on an excluded device: the new visitor ID is refused from the start.
 const acceptedHere=await route.POST(request({consent:'accepted'},{cookie:'grimorio_statistics_excluded=1'}));
 assert.ok(excludedIds.has(acceptedHere.cookies.get('grimorio_statistics_visitor').value.split('.')[0]));
 excludedIds.clear();
 assert.equal((await route.GET(new NextRequest('https://ilgrimorio.app/api/analytics'))).headers.get('cache-control'),'no-store');
 const maintenance=load('app/api/analytics/maintenance/route.ts',{'@/lib/analytics':{purgeAnalytics:async()=>{}}});process.env.CRON_SECRET='maintenance-test';
 assert.equal((await maintenance.GET(new NextRequest('https://ilgrimorio.app/api/analytics/maintenance'))).status,401);
 assert.equal((await maintenance.GET(new NextRequest('https://ilgrimorio.app/api/analytics/maintenance',{headers:{authorization:'Bearer maintenance-test'}}))).status,200);
 const LoginForm=()=>null;
 const statistics=load('app/admin/statistiche/page.tsx',{'@/lib/spell-index':{getSpellIndex:async()=>{throw new Error('private data leaked')}},'@/lib/monster-index':{getMonsterListIndex:async()=>{throw new Error('private data leaked')}},'@/lib/admin-auth':{isAdmin:async()=>false},'@/components/admin-login':{AdminLogin:LoginForm},'@/lib/analytics':{readStatistics:async()=>{throw new Error('private data leaked')},VERCEL_ANALYTICS_URL:''},'@/app/actions/admin-statistics':{deleteMarkerAction(){},excludeDeviceAction(){}},'@/lib/analytics-exclusion':{deviceExcluded:async()=>false},'@/components/statistics/marker-form':{MarkerForm:()=>null},'@/components/statistics/period-select':{PeriodSelect:()=>null}});
 assert.equal((await statistics.default({searchParams:Promise.resolve({})})).type,LoginForm,'without login only the login form is shown');
 await pg.close();console.log('Analytics: counted by default with «No» excluding, signed IDs, admin exclusion, validation, unique counts, duplicate events, PostgreSQL aggregates, first party only and retention passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
