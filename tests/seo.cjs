// PROMPT 45 (Google): titles, descriptions, canonical, JSON-LD of lib/seo.ts; robots.txt; the sitemap built from the same
// lists as the search, without hidden sections, parts and cards, «In arrivo», noindex pages or pictures.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {createRequire}=require('node:module');
function load(relative,deps={}){const file=path.resolve(relative),m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(id=>deps[id]??createRequire(file)(id),m,m.exports);return m.exports;}

const seo=load('lib/seo.ts');
// Titles: «Nome — Sezione · Il Grimorio.App», «(2014)» after the name of a 2014 page.
assert.equal(seo.seoTitle('Palla di fuoco','Incantesimi','2024'),'Palla di fuoco — Incantesimi · Il Grimorio.App');
assert.equal(seo.seoTitle('Palla di fuoco','Incantesimi','2014'),'Palla di fuoco (2014) — Incantesimi · Il Grimorio.App');
assert.equal(seo.seoTitle('Compendio'),'Compendio · Il Grimorio.App');
// Descriptions: always 70–160 characters, padded or cut at a word.
for(const text of ['Breve.','x'.repeat(10)+' '+'parola '.repeat(60),'Una descrizione di lunghezza giusta, che resta com’è perché sta tra settanta e centosessanta caratteri.']){
  const out=seo.fitDescription(text);
  assert.ok(out.length>=70&&out.length<=160,`${out.length}: ${out}`);
}
assert.equal(seo.fitDescription('Una descrizione di lunghezza giusta, che resta com’è perché sta tra settanta e centosessanta caratteri.'),'Una descrizione di lunghezza giusta, che resta com’è perché sta tra settanta e centosessanta caratteri.');
const spell24=seo.spellDescription({nome:'Palla di fuoco',livello:3,scuola:'Invocazione',edizione:'2024'}),spell14=seo.spellDescription({nome:'Palla di fuoco',livello:3,scuola:'Invocazione',edizione:'2014'});
assert.notEqual(spell24,spell14,'2014 and 2024 differ');
assert.match(spell14,/D&D 2014/);assert.match(spell24,/D&D 2024/);
assert.match(seo.spellDescription({nome:'Luce',livello:0,edizione:'2024'}),/trucchetto/);
// A creature of the redazione: only the head of the card (never a hidden section).
const redazione=seo.monsterDescription({nome:'Drago di prova',tipo:'Drago (cromatico)',taglia:'Enorme',gs:'17',edizione:'2024',origine:'redazione'});
assert.equal(redazione,'Drago di prova, creatura originale della redazione, Drago Enorme, GS 17, D&D 2024. Statistiche, tratti e azioni in italiano su Il Grimorio.App.');
assert.equal(seo.editionOfPage({'2014':1,'2024':1}),'entrambe');
assert.equal(seo.editionOfPage({'2014':1,'2024':1},['2014']),'2014');
assert.equal(seo.editionOfPage({'2014':1}),'2014');
// Canonical: no query, no fragment, no trailing slash.
assert.equal(seo.canonicalPath('/spell/palla-di-fuoco?da=amico#x'),'/spell/palla-di-fuoco');
assert.equal(seo.canonicalPath('/grimorio/'),'/grimorio');
assert.equal(seo.canonicalPath('/?cerca=drago'),'/');
const meta=seo.pageMetadata({name:'Aboleth',section:'Bestiario',edition:'2014',description:seo.monsterDescription({nome:'Aboleth',edizione:'2014'}),path:'/mostro/aboleth-2014?x=1'});
assert.equal(meta.alternates.canonical,'/mostro/aboleth-2014');
assert.equal(meta.openGraph.title,meta.title);assert.equal(meta.twitter.title,meta.title);
assert.equal(meta.openGraph.description,meta.description);assert.equal(meta.twitter.description,meta.description);
assert.equal(meta.openGraph.url,'/mostro/aboleth-2014');
assert.ok(!('images' in meta.openGraph),'preview pictures untouched: the layout keeps its own');
// JSON-LD: BreadcrumbList with absolute addresses, Home first; WebSite with the real search of the Home.
const crumbs=seo.breadcrumbLd([{name:'Incantesimi',path:'/grimorio'},{name:'Palla di fuoco',path:'/spell/palla-di-fuoco?x'}]);
assert.equal(crumbs['@type'],'BreadcrumbList');
assert.deepEqual(crumbs.itemListElement.map(item=>[item.position,item.name,item.item]),[[1,'Home','https://ilgrimorio.app/'],[2,'Incantesimi','https://ilgrimorio.app/grimorio'],[3,'Palla di fuoco','https://ilgrimorio.app/spell/palla-di-fuoco']]);
const site=seo.websiteLd();
assert.equal(site.potentialAction.target.urlTemplate,'https://ilgrimorio.app/?cerca={search_term_string}');
assert.equal(site.potentialAction['query-input'],'required name=search_term_string');
assert.ok(!JSON.stringify([site,crumbs]).match(/Product|Review|AggregateRating/),'no product or review schema');
// The Home really reads ?cerca= (components/home): the SearchAction leads to a working search.
assert.ok(fs.readFileSync('components/search/home-search.tsx','utf8').includes('params.get("cerca")'),'the Home search reads ?cerca=');
// The JSON-LD script escapes «<» so no text can close it.
const jsonLd=load('components/seo/json-ld.tsx');
const element=jsonLd.JsonLd({data:{name:'</script><b>'}});
assert.equal(element.props.type,'application/ld+json');
assert.ok(!element.props.dangerouslySetInnerHTML.__html.includes('<'));

// robots.txt: open, except the reserved area, the APIs and the noindex pages; points to the sitemap.
const robots=load('app/robots.ts').default();
assert.equal(robots.sitemap,'https://ilgrimorio.app/sitemap.xml');
for(const blocked of ['/admin','/api/','/account','/personaggi','/segnala','/bestiario/proponi']) assert.ok(robots.rules[0].disallow.includes(blocked),blocked);
assert.equal(robots.rules[0].allow,'/');
assert.ok(load('app/robots.ts').revalidate>=86400&&load('app/sitemap.ts',{'@/lib/sitemap':{}}).revalidate>=86400,'robots and sitemap: at most one ISR write a day');

// Sitemap: the rows of the search, less what is hidden.
const realPs=load('lib/public-sections.ts');
const rows=[
  {nome:'Palla di fuoco',label:'',href:'/spell/palla-di-fuoco',edizione:'2024'},
  {nome:'Palla di fuoco',label:'',href:'/spell/palla-di-fuoco-2014',edizione:'2014'},
  {nome:'Segreto',label:'',href:'/spell/segreto',edizione:'2024'},
  {nome:'Aboleth',label:'',href:'/mostro/aboleth',edizione:'2024',parte:'mostri'},
  {nome:'Aboleth',label:'',href:'/mostro/aboleth-2014',edizione:'2014',parte:'mostri'},
  {nome:'Drago di prova',label:'',href:'/mostro/hb-drago',parte:'grimorio'},
  {nome:'Mago',label:'',href:'/classi/mago',edizione:'2024'},
  {nome:'Mago',label:'',href:'/classi/mago?edizione=2014',edizione:'2014'},
  {nome:'Evocatore',label:'',href:'/classi/mago#sottoclasse',edizione:'2024',parte:'tab-sottoclasse'},
  {nome:'Spada lunga',label:'',href:'/equipaggiamento/armi/spada-lunga',edizione:'2014'},
];
const searchIndex=load('lib/search-index.ts',{'./conditions-list':{},'./adventuring-gear-editions':{},'./armor':{},'./classes':{},'./corrected-content':{},'./equipment':{},'./equipment-types':{},'./magic-items-editions':{},'./manual':{},'./manual-types':{},'./monster-index':{},'./monsters-types':{},'./spell-index':{},'./spell-name':{},'./tools-editions':{},'./search':{},'./public-sections':realPs,'./spell-public-id':{},'./english-names':{}});
async function sitemapWith(state){
  const lib=load('lib/sitemap.ts',{'server-only':{},'@/lib/concentration':{rulePages:[{id:'concentrazione'}]},'@/lib/public-sections':realPs,
    '@/lib/search-index':{SEARCH_SOURCES:[{rows:async environment=>{assert.equal(environment,'production','never the preview-only Manual');return rows;}}],hiddenRow:searchIndex.hiddenRow},
    '@/lib/section-visibility':{visibilityState:async()=>({sections:[],parts:[],cards:[],soon:[],...state})},'@/lib/support':{SUPPORT_URL:'https://ko-fi.com/ilgrimorioapp'}});
  return lib.sitemapPaths();
}
(async()=>{
  const all=await sitemapWith({});
  for(const page of ['/','/grimorio','/bestiario','/compendio','/classi','/oggetti-magici','/compendio/condizioni','/avanzamento','/sostieni','/regole/concentrazione',
    '/spell/palla-di-fuoco','/spell/palla-di-fuoco-2014','/mostro/aboleth','/mostro/aboleth-2014','/mostro/hb-drago','/classi/mago','/equipaggiamento/armi/spada-lunga','/bestiario/creati-da-voi','/bestiario/del-grimorio'])
    assert.ok(all.includes(page),`in the sitemap: ${page}`);
  assert.equal(new Set(all).size,all.length,'one entry per address');
  assert.ok(!all.some(page=>/[?#]/.test(page)),'no query, no anchor');
  assert.ok(!all.some(page=>/^\/(admin|api|account|personaggi|segnala|preferiti|dadi|manuale$|in-arrivo|immagini-mostri)|proponi/.test(page)),'no reserved, noindex or picture address');
  // A card hidden with the eye (or by «Modalità solo SRD», which joins the same list) never appears.
  const hiddenCard=await sitemapWith({cards:['/spell/segreto']});
  assert.ok(!hiddenCard.includes('/spell/segreto'),'hidden card out');
  assert.ok(hiddenCard.includes('/spell/palla-di-fuoco'));
  // A hidden edition, collection or section.
  const no2014=await sitemapWith({parts:['incantesimi:2014']});
  assert.ok(!no2014.includes('/spell/palla-di-fuoco-2014')&&no2014.includes('/spell/palla-di-fuoco'),'hidden edition out');
  const noBestiary=await sitemapWith({sections:['bestiario']});
  assert.ok(!noBestiary.some(page=>page.startsWith('/mostro/')||page.startsWith('/bestiario')),'hidden section out, lists and cards');
  const noRedazione=await sitemapWith({parts:['bestiario:grimorio']});
  assert.ok(!noRedazione.includes('/mostro/hb-drago')&&!noRedazione.includes('/bestiario/del-grimorio')&&!noRedazione.includes('/bestiario/creature-originali'),'hidden collection out');
  assert.ok(noRedazione.includes('/mostro/aboleth'));
  // «In arrivo»: the public sees a page under construction, Google gets nothing.
  const soon=await sitemapWith({soon:['bestiario:grimorio','oggetti-magici']});
  assert.ok(!soon.includes('/mostro/hb-drago')&&!soon.includes('/bestiario/del-grimorio')&&!soon.includes('/oggetti-magici'),'«In arrivo» out');
  const community=await sitemapWith({parts:['bestiario:homebrew']});
  assert.ok(!community.includes('/bestiario/creati-da-voi')&&!community.includes('/bestiario/creati-da-voi/bilanciamento'));
  // The admin switches refresh the sitemap at once, not only once a day.
  for(const file of ['app/actions/admin-cards.ts','app/actions/admin-sections.ts','app/actions/admin-srd-only.ts','app/actions/admin-homebrew.ts','app/actions/admin-monster-import.ts'])
    assert.ok(fs.readFileSync(file,'utf8').includes('revalidatePath("/sitemap.xml")'),file);
  // C1: no «X-Powered-By: Next.js».
  assert.match(fs.readFileSync('next.config.mjs','utf8'),/poweredByHeader:\s*false/);
  // One place for the address of the site.
  assert.match(fs.readFileSync('app/layout.tsx','utf8'),/metadataBase:\s*new URL\(SITE_URL\)/);
  console.log(`SEO: titles, descriptions 70–160, canonical, JSON-LD, robots, sitemap (${all.length} addresses in the sample) without hidden, «In arrivo» or noindex pages.`);
})().catch(error=>{console.error(error);process.exit(1);});
