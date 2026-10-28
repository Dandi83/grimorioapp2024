const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {createRequire}=require('node:module'),{PGlite}=require('@electric-sql/pglite');
function load(relative,deps={}){const file=path.resolve(relative),m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(id=>deps[id]??createRequire(file)(id),m,m.exports);return m.exports;}
// The hourly ceiling of the notices of new reports and proposals (28 October 2026, waiting for Turnstile).
(async()=>{
 const pg=new PGlite(),pool={query:(sql,params)=>pg.query(sql,params)};
 const notice=load('lib/notice-limit.ts',{'server-only':{},'./db':{pool}});
 const turns=[];
 for(let i=0;i<notice.NOTICES_PER_HOUR+3;i++)turns.push(await notice.noticeTurn('segnalazioni'));
 assert.deepEqual(turns,[...Array(notice.NOTICES_PER_HOUR).fill('send'),'summary','skip','skip'],'10 notices, one summary, then nothing');
 assert.equal(await notice.noticeTurn('proposte'),'send','each kind has its own ceiling');
 assert.equal(notice.summaryNotice('segnalazioni').title,'Molte segnalazioni nell’ultima ora');
 assert.equal(notice.summaryNotice('proposte').url,'/admin/proposte');
 // An hour later the notices start again.
 await pg.query("UPDATE grimorio_notice_log SET inviato_il=now()-interval '61 minutes'");
 assert.equal(await notice.noticeTurn('segnalazioni'),'send');
 await pg.query("UPDATE grimorio_notice_log SET inviato_il=now()-interval '2 days'");
 await notice.noticeTurn('segnalazioni');
 assert.equal((await pg.query("SELECT count(*)::int AS n FROM grimorio_notice_log")).rows[0].n,1,'rows older than a day are deleted');
 console.log(`Notices: at most ${notice.NOTICES_PER_HOUR} an hour for each kind, then one summary «Molte segnalazioni nell’ultima ora», then nothing until the hour has passed.`);
})().catch(error=>{console.error(error);process.exit(1);});
