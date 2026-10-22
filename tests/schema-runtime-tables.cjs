const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const {createRequire}=require('node:module');
const {PGlite}=require('@electric-sql/pglite');
const {drizzle}=require('drizzle-orm/pglite');
const {getTableConfig}=require('drizzle-orm/pg-core');

const cache=new Map(),deps={};
function load(relative){
 const filename=path.resolve(relative);
 if(cache.has(filename))return cache.get(filename).exports;
 const mod={exports:{}};cache.set(filename,mod);
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id in deps)return deps[id];
  if(id.startsWith('@/')||id.startsWith('./')){
   const file=id.startsWith('@/')?path.resolve(id.slice(2)):path.resolve(path.dirname(filename),id);
   if(fs.existsSync(file+'.ts'))return load(file+'.ts');
  }
  return createRequire(filename)(id);
 },mod,mod.exports);return mod.exports;
}
// Postgres type names as reported by information_schema, keyed by Drizzle SQL type.
const sqlType={text:'text',integer:'integer',boolean:'boolean',jsonb:'jsonb',uuid:'uuid','timestamp with time zone':'timestamp with time zone'};

(async()=>{
 const pg=new PGlite();
 const pool={query:(sql,params)=>pg.query(sql,params),connect:async()=>({query:(sql,params)=>pg.query(sql,params),release(){}})};
 deps['server-only']={};deps['./db']=deps['@/lib/db']={pool};
 const schema=load('lib/db/schema.ts');
 // Base tables exist already in every database.
 await pg.exec(`CREATE TABLE monsters (id text PRIMARY KEY, nome text NOT NULL DEFAULT '')`);
 await pg.exec("INSERT INTO monsters (id) VALUES ('m')");
 // Let each module create its table exactly as it does in production.
 await load('lib/content-editions.ts').saveContentEdition('monster','m','2024');
 await load('lib/monster-extra-storage.ts').saveMonsterExtraFields(drizzle(pg),'m',{iniziativa:'+2'});
 await load('lib/monster-habitats.ts').saveMonsterHabitats(drizzle(pg),'m',['Foresta']);
 const analytics=load('lib/analytics.ts');
 const id='11111111-1111-4111-8111-111111111111';
 await analytics.storeAnalyticsEvent({event:'page_view',id,view:id,session:id,path:'/',test:true,source:'direct',activeSeconds:0,scrollPercent:0},'visitor');
 await analytics.purgeAnalytics();
 const limit=load('lib/admin-login-limit.ts');
 await limit.loginBlocked(limit.addressKey('203.0.113.1'));
 await load('lib/feedback.ts').ensureFeedbackTables();
 deps['next/headers']={cookies:async()=>({get:()=>undefined,set(){},delete(){}})};
 await load('lib/admin-auth.ts').startAdminSession();
 deps['next/cache']={unstable_cache:fn=>fn};
 await load('lib/content-overrides.ts').ensureOverridesTable();
 await load('lib/editor-log.ts').ensureEditorLogTable();
 await load('lib/section-visibility.ts').ensureSectionTables();
 for(const table of [schema.contentEditions,schema.monsterDetails,schema.monsterHabitats,schema.analyticsEvents,schema.adminLoginFailures,schema.feedbackReports,schema.feedbackLimits,schema.adminSessions,schema.contentOverrides,schema.editorLog,schema.sectionVisibility,schema.sectionVisibilityLog]){
  const config=getTableConfig(table);
  const {rows}=await pg.query('SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position',[config.name]);
  assert.ok(rows.length,`${config.name} is created by the runtime code`);
  const actual=Object.fromEntries(rows.map(r=>[r.column_name,r]));
  assert.deepEqual(Object.keys(actual).sort(),config.columns.map(c=>c.name).sort(),`${config.name}: same columns in schema.ts and in the runtime DDL`);
  for(const column of config.columns){
   const real=actual[column.name];
   assert.equal(real.data_type,sqlType[column.getSQLType()]??column.getSQLType(),`${config.name}.${column.name} type`);
   assert.equal(real.is_nullable==='NO',column.notNull||column.primary,`${config.name}.${column.name} nullability`);
   assert.equal(real.column_default!==null,column.hasDefault,`${config.name}.${column.name} default`);
  }
 }
 await pg.close();
 console.log('Schema: runtime-created tables (editions, creature details, habitats, analytics, login failures, reports, admin sessions, manual corrections, editor log, section visibility and its log) match their schema.ts descriptions.');
})().catch(error=>{console.error(error);process.exit(1);});
