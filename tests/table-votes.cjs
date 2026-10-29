// «L'hai provato al tavolo?» (PROMPT 19): one vote per device and card, changeable, counted from 5, test visits and the
// administrator's devices left out, deleted with the card; the public API gives the counts only from 5 votes.
// Run: NODE_OPTIONS=--require=./tests/register-ts.cjs node tests/table-votes.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {createRequire}=require('node:module'),{PGlite}=require('@electric-sql/pglite');
function load(relative,deps={}){const file=path.resolve(relative),m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(id=>deps[id]??createRequire(file)(id),m,m.exports);return m.exports;}

(async()=>{
 process.env.ANALYTICS_SECRET='analytics-only-secret';
 const pg=new PGlite(),pool={query:(sql,params)=>pg.query(sql,params),connect:async()=>({query:(sql,params)=>sql.startsWith('SELECT pg_advisory_xact_lock')?pg.query('SELECT 1'):pg.query(sql,params),release(){}})};
 const analytics=load('lib/analytics.ts',{'server-only':{},'./db':{pool}});
 const votes=load('lib/table-votes.ts',{'server-only':{},'./db':{pool},'./analytics':analytics});
 const card='homebrew-drago-di-nebbia',other='homebrew-spirito';
 // Before any vote: no table, nothing shown, no error.
 assert.equal(await votes.readPublicTableCounts(card),null);assert.equal((await votes.readAllTableCounts()).size,0);
 // One vote per device and card: the second vote of a device changes the first.
 assert.equal(await votes.storeTableVote('v1',card,'facile',false),true);
 assert.equal(await votes.storeTableVote('v1',card,'giusto',false),true);
 assert.deepEqual((await votes.readAllTableCounts()).get(card),{facile:0,giusto:1,difficile:0,total:1},'changed, never counted twice');
 assert.equal(await votes.storeTableVote('v1',other,'difficile',false),true,'the same device votes another card');
 // The key is a keyed hash of the visitor ID, never the ID.
 const keys=(await pg.query('SELECT chiave FROM grimorio_table_votes')).rows.map(row=>row.chiave);
 assert.ok(keys.every(key=>/^[0-9a-f]{64}$/.test(key)&&key!=='v1'));assert.equal(keys[0],analytics.tableVoteKey('v1'));
 // Shown from 5 votes: 4 are not enough.
 for(const [visitor,vote] of [['v2','giusto'],['v3','giusto'],['v4','difficile']])await votes.storeTableVote(visitor,card,vote,false);
 assert.equal(await votes.readPublicTableCounts(card),null,'4 votes: the count is not shown yet');
 assert.equal(votes.TABLE_THRESHOLD,5);
 // Test visits never count.
 await votes.storeTableVote('t1',card,'facile',true);
 assert.equal(await votes.readPublicTableCounts(card),null,'a test visit is not the 5th vote');
 await votes.storeTableVote('v5',card,'facile',false);
 assert.deepEqual(await votes.readPublicTableCounts(card),{facile:1,giusto:3,difficile:1,total:5});
 // An administrator's device: excluded, it never votes again and its votes go.
 await analytics.excludeVisitor('v5');
 assert.equal(await votes.storeTableVote('v5',card,'difficile',false),false,'refused');
 assert.equal(await votes.readPublicTableCounts(card),null,'its vote removed: 4 again');
 assert.equal((await votes.readAllTableCounts()).get(card).total,4,'the administrator sees them all, also under 5');
 // The votes stay while the card exists.
 await votes.deleteTableVotes(card);
 assert.equal((await votes.readAllTableCounts()).get(card),undefined);assert.equal((await votes.readAllTableCounts()).get(other).total,1);
 for(let i=0;i<5;i++)await votes.storeTableVote(`w${i}`,card,'giusto',false);

 // The public API: counts only from 5; 404 for a card that is not of «I mostri creati da voi» or a closed section.
 const {NextRequest}=require('next/server');
 let shown=true;
 const route=load('app/api/prove-tavolo/route.ts',{'@/lib/admin-auth':{isAdmin:async()=>false},'@/lib/community':{communityPublic:()=>true},
  '@/lib/homebrew':{getHomebrew:async id=>[card,other].includes(id)?{id}:undefined},'@/lib/public-sections':require('../lib/public-sections.ts'),
  '@/lib/section-visibility':{visibilityState:async()=>({sections:[],parts:shown?[]:['bestiario:homebrew'],cards:[],soon:[]})},'@/lib/table-votes':votes});
 const get=async id=>{const response=await route.GET(new NextRequest(`https://ilgrimorio.app/api/prove-tavolo?id=${id}`));return {status:response.status,cache:response.headers.get('cache-control'),body:await response.json()};};
 assert.deepEqual((await get(card)).body,{threshold:5,counts:{facile:0,giusto:5,difficile:0,total:5}});
 assert.deepEqual((await get(other)).body,{threshold:5,counts:null},'1 vote: nothing shown');
 assert.equal((await get(card)).cache,'no-store');
 assert.equal((await get('troll')).status,404);assert.equal((await get('..%2Fx')).status,404);
 shown=false;assert.equal((await get(card)).status,404,'hidden section: nothing');
 await pg.close();
 console.log('Prove al tavolo: one vote per device and card (keyed hash), changeable, shown from 5, test visits and administrator devices left out, deleted with the card; public API from 5 votes only.');
})().catch(error=>{console.error(error);process.exit(1);});
