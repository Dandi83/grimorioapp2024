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
 await pg.query("UPDATE grimorio_analytics_events SET received_at=now()-interval '91 days'");await analytics.purgeAnalytics();assert.equal((await pg.query('SELECT count(*)::int AS n FROM grimorio_analytics_events')).rows[0].n,0);
 let admin=false,stored=0;const afterCallbacks=[],excludedIds=new Set();
 const {NextRequest}=require('next/server');
 const fakeAnalytics={analyticsConfigured:()=>true,analyticsSecret:()=>process.env.ANALYTICS_SECRET||'',storeAnalyticsEvent:async()=>{stored++;return true},excludeVisitor:async id=>{excludedIds.add(id)},isVisitorExcluded:async id=>excludedIds.has(id)};
 const exclusion=load('lib/analytics-exclusion.ts',{'server-only':{},'next/headers':{cookies:async()=>({get:()=>undefined,set(){}})},'./analytics':fakeAnalytics});
 const route=load('app/api/analytics/route.ts',{'next/server':{...require('next/server'),after:fn=>afterCallbacks.push(fn)},'@/lib/admin-auth':{isAdmin:async()=>admin},'@/lib/analytics':fakeAnalytics,'@/lib/analytics-exclusion':exclusion,'@/lib/analytics-events':{parseAnalyticsInput},'@/lib/spells':{getSpellById:async()=>({nome_italiano:'Test'})},'@/lib/monsters':{getMonsterById:async()=>({id:'gatto',nome:'Gatto'})},'@/lib/monsters-types':{isSrdAnimal:()=>true},'@/lib/spell-name':{spellName:name=>name}});
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
 const statistics=load('app/admin/statistiche/page.tsx',{'@/lib/admin-auth':{isAdmin:async()=>false},'@/components/admin-login':{AdminLogin:LoginForm},'@/lib/analytics':{readStatistics:async()=>{throw new Error('private data leaked')},VERCEL_ANALYTICS_URL:''},'@/app/actions/admin-statistics':{deleteMarkerAction(){},excludeDeviceAction(){}},'@/lib/analytics-exclusion':{deviceExcluded:async()=>false},'@/components/statistics/marker-form':{MarkerForm:()=>null},'@/components/statistics/period-select':{PeriodSelect:()=>null}});
 assert.equal((await statistics.default({searchParams:Promise.resolve({})})).type,LoginForm,'without login only the login form is shown');
 await pg.close();console.log('Analytics: counted by default with «No» excluding, signed IDs, admin exclusion, validation, unique counts, duplicate events, PostgreSQL aggregates, first party only and retention passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
