const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {createRequire}=require('node:module'),{randomUUID}=require('node:crypto');
function load(relative,deps={}){const file=path.resolve(relative),m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(id=>deps[id]??createRequire(file)(id),m,m.exports);return m.exports;}
// «Sostieni il Grimorio» (28 October 2026): the switch SUPPORT_URL is empty in the code; while it is, nothing exists.
const support=load('lib/support.ts');
assert.equal(support.SUPPORT_URL,'','the Ko-fi address is not set yet: Daniele gives it later');
delete process.env.GRIMORIO_SUPPORT_URL_PROVA;
assert.equal(support.supportUrl(),'','empty: no link, no card, no page');
// /sostieni without the address: the generic 404.
let missing=0;
const page=load('app/sostieni/page.tsx',{'next/navigation':{notFound:()=>{missing++;throw new Error('NEXT_NOT_FOUND');}},'@/components/support/support-page':{SupportPage:()=>null},'@/lib/support':support});
assert.throws(()=>page.default(),/NEXT_NOT_FOUND/);assert.equal(missing,1);
// The links render nothing without the address (Home, /info, side column, card).
const {renderToStaticMarkup}=require('react-dom/server');const React=require('react');
const link=load('components/support/support-link.tsx',{'next/link':{__esModule:true,default:props=>React.createElement('a',props)}});
assert.equal(renderToStaticMarkup(React.createElement(link.SupportLink,{enabled:false,from:'home'},'Sostieni il Grimorio')),'');
assert.match(renderToStaticMarkup(React.createElement(link.SupportLink,{enabled:true,from:'info'},'Sostieni il Grimorio')),/href="\/sostieni".*data-support-link="info"/);
// The browser tests set a made-up address; only https addresses are accepted.
process.env.GRIMORIO_SUPPORT_URL_PROVA='https://ko-fi.com/grimorio-prova-e2e';
assert.equal(support.supportUrl(),'https://ko-fi.com/grimorio-prova-e2e');
process.env.GRIMORIO_SUPPORT_URL_PROVA='javascript:alert(1)';assert.equal(support.supportUrl(),'');
process.env.GRIMORIO_SUPPORT_URL_PROVA='http://ko-fi.com/x';assert.equal(support.supportUrl(),'');
delete process.env.GRIMORIO_SUPPORT_URL_PROVA;
assert.deepEqual(support.SUPPORT_AMOUNTS.map(row=>[row.value,row.label]),[[1,'un dado'],[3,'un caffè'],[5,'una pozione']]);
assert.equal(support.DEFAULT_AMOUNT,3);
// The events: where the link was, the amount; nothing else.
const {parseAnalyticsInput}=load('lib/analytics-events.ts');
const event=(name,props={})=>({event:name,id:randomUUID(),view:randomUUID(),session:randomUUID(),path:'/sostieni',test:false,source:'direct',activeSeconds:0,scrollPercent:0,device:'iphone',...props});
assert.equal(parseAnalyticsInput(event('support_link',{path:'/',from:'card'})).from,'card');
assert.equal(parseAnalyticsInput(event('support_link',{path:'/info',from:'altrove'})),undefined);
assert.equal(parseAnalyticsInput(event('support_page')).event,'support_page');
assert.equal(parseAnalyticsInput(event('support_click',{amount:3})).amount,3);
assert.equal(parseAnalyticsInput(event('support_click',{amount:100})),undefined,'only 1, 3 or 5 euro');
assert.equal(parseAnalyticsInput(event('share_tap',{from:'sostieni'})).from,'sostieni');
// No content or function behind a payment: the site never handles one.
for(const file of ['components/support/support-page.tsx','lib/support.ts'])assert.ok(!/stripe|paypal|checkout|card number/i.test(fs.readFileSync(file,'utf8')),file);
console.log('Sostieni: off while SUPPORT_URL is empty (no link, no card, /sostieni 404); test address only from the browser tests; events with origin and amount.');
