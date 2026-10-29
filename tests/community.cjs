// «I mostri creati da voi» (PROMPT 13): the switch, the chip fields of the form (old texts written by hand too),
// the proposals API closed to the visitors while it is off.
// Run: NODE_OPTIONS=--require=./tests/register-ts.cjs node tests/community.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {createRequire}=require('node:module');
function load(relative,deps={}){const file=path.resolve(relative),m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(id=>deps[id]??createRequire(file)(id),m,m.exports);return m.exports;}
const f=require('../lib/homebrew-fields.ts');
const community=require('../lib/community.ts');

(async()=>{
 // The switch: a constant of the code, like SUPPORT_URL; the tests may turn it on, never Vercel.
 assert.equal(typeof community.COMMUNITY_PUBLIC,'boolean');
 const env={...process.env};
 delete process.env.GRIMORIO_COMMUNITY_TEST_PUBLIC;delete process.env.VERCEL;
 assert.equal(community.communityPublic(false),false);assert.equal(community.communityPublic(true),true);
 process.env.GRIMORIO_COMMUNITY_TEST_PUBLIC='on';assert.equal(community.communityPublic(false),true,'browser tests: on');
 process.env.VERCEL='1';assert.equal(community.communityPublic(false),false,'never on Vercel through the environment');
 process.env=env;

 // Damage types and conditions: chips → «freddo, necrotico» (the order of the menu), back the same.
 const D=f.DAMAGE_TYPES;
 assert.equal(D.length,13);
 assert.deepEqual(f.readChips('freddo, necrotico',D),{selected:['freddo','necrotico'],extra:''});
 assert.equal(f.writeChips({selected:['necrotico','freddo'],extra:''},D),'freddo, necrotico');
 assert.equal(f.writeChips(f.toggleChip(f.readChips('freddo',D),'acido'),D),'acido, freddo');
 assert.equal(f.writeChips(f.toggleChip(f.readChips('acido, freddo',D),'acido'),D),'freddo','a second tap removes it');
 // Old texts written by hand: capitals, «e», «;»…
 assert.deepEqual(f.readChips('Freddo e Veleno',D).selected,['freddo','veleno']);
 assert.deepEqual(f.readChips('veleno; acido',D).selected,['acido','veleno']);
 // …and what is not a choice stays word for word: never split in a way that changes its sense.
 const qualified='contundente, perforante e tagliente da attacchi non magici';
 assert.deepEqual(f.readChips(qualified,D),{selected:['contundente'],extra:'perforante e tagliente da attacchi non magici'});
 assert.equal(f.writeChips(f.readChips(qualified,D),D),qualified,'read and written back: the same text');
 const tapped=f.writeChips(f.toggleChip(f.readChips(qualified,D),'fuoco'),D);
 assert.equal(tapped,'contundente, fuoco, perforante e tagliente da attacchi non magici');
 assert.deepEqual(f.readChips(tapped,D).selected,['contundente','fuoco'],'a chip tapped stays chosen next to the rest');
 assert.deepEqual(f.readChips('',D),{selected:[],extra:''});
 const C=f.CONDITIONS_BY_EDITION;
 assert.equal(C['2014'].length,15);assert.equal(C['2024'].length,15);
 assert.deepEqual(f.readChips('Avvelenato, privo di sensi',C['2024']).selected,['avvelenato','privo di sensi']);

 // Languages of each edition, «altra» and «Capisce ma non può parlare».
 const L=f.LANGUAGES_BY_EDITION['2024'],L14=f.LANGUAGES_BY_EDITION['2014'];
 assert.ok(L.includes('Comune dei Segni')&&!L14.includes('Comune dei Segni'));
 assert.deepEqual(f.readLanguages('Comune, Draconico, telepatia 36 m',L),{selected:['Comune','Draconico'],extra:'telepatia 36 m',understandsOnly:false});
 assert.equal(f.writeLanguages(f.readLanguages('Comune, Draconico, telepatia 36 m',L),L),'Comune, Draconico, telepatia 36 m');
 assert.deepEqual(f.readLanguages('capisce il Comune e il Draconico ma non lo parla',L14),{selected:['Comune','Draconico'],extra:'',understandsOnly:true},'the SRD form');
 // «Capisce ma non può parlare»: written as the SRD sheets do (PROMPT 14), with the articles and lo/li.
 assert.equal(f.writeLanguages({selected:['Comune'],extra:'',understandsOnly:true},L),'capisce il Comune ma non lo parla');
 assert.equal(f.writeLanguages({selected:['Silvano','Comune'],extra:'',understandsOnly:true},L),'capisce il Comune e il Silvano ma non li parla');
 assert.equal(f.writeLanguages({selected:['Comune','Elfico','Gnomesco'],extra:'telepatia 36 m',understandsOnly:true},L),"capisce il Comune, l'Elfico e lo Gnomesco ma non li parla, telepatia 36 m");
 assert.deepEqual([f.withArticle('Abissale'),f.withArticle('Halfling'),f.withArticle('Gnomesco'),f.withArticle('Sottocomune'),f.withArticle('Draconico')],["l'Abissale","l'Halfling",'lo Gnomesco','il Sottocomune','il Draconico']);
 for(const text of ['capisce il Comune ma non lo parla','capisce il Comune e il Silvano ma non li parla, telepatia 36 m',"capisce l'Abissale ma non lo parla"])
  assert.equal(f.writeLanguages(f.readLanguages(text,L),L),text,`read and written back: ${text}`);
 // Proposals saved with the text of the first version of the form still read well, and are written in the SRD form.
 assert.deepEqual(f.readLanguages('capisce Comune, Draconico ma non può parlare',L),{selected:['Comune','Draconico'],extra:'',understandsOnly:true});
 assert.equal(f.writeLanguages(f.readLanguages('capisce Comune, Draconico ma non può parlare',L),L),'capisce il Comune e il Draconico ma non li parla');
 // A sentence with something that is not a language of the menu stays word for word.
 assert.equal(f.writeLanguages(f.readLanguages("capisce il Comune più un'altra lingua ma non le parla",L),L),"capisce il Comune più un'altra lingua ma non le parla");
 assert.deepEqual(f.readLanguages('—',L),{selected:[],extra:'',understandsOnly:false});
 assert.equal(f.readLanguages("Comune più un'altra lingua",L).extra,"Comune più un'altra lingua");

 // Senses: rows with their distance; the rest of an old text kept; the passive Perception computed.
 assert.deepEqual(f.readSenses('scurovisione 18 m, vista cieca 3 m'),{rows:[{sense:'scurovisione',metres:18},{sense:'vista cieca',metres:3}],extra:''});
 assert.equal(f.writeSenses({rows:[{sense:'scurovisione',metres:36},{sense:'percezione tellurica',metres:18}],extra:''}),'scurovisione 36 m, percezione tellurica 18 m');
 const oldSenses='scurovisione 18 m, vista cieca 3 m (cieca oltre questo raggio)';
 assert.deepEqual(f.readSenses(oldSenses).rows,[{sense:'scurovisione',metres:18}]);
 assert.equal(f.writeSenses(f.readSenses(oldSenses)),oldSenses);
 assert.equal(f.readSenses('Scurovisione 18 metri').rows[0].metres,18);
 assert.deepEqual(f.SENSE_DISTANCES[0],3);assert.equal(f.SENSE_DISTANCES.at(-1),36);
 assert.equal(f.passivePerception(14,''),12);assert.equal(f.passivePerception(8,'Percezione +6, Furtività +2'),16);assert.equal(f.passivePerception(NaN,''),10);

 // The proposals API: 403 for a visitor while it is off; the administrator can try it.
 const {NextRequest}=require('next/server');
 let admin=false,on=false;
 const route=load('app/api/proposte/route.ts',{
  '@/lib/community':{communityPublic:()=>on},'@/lib/admin-auth':{isAdmin:async()=>admin},
  '@/lib/section-visibility':{visibilityState:async()=>({sections:[],parts:on?[]:['bestiario:homebrew'],cards:[],soon:[]})},
  '@/lib/feedback':{FORM_UNAVAILABLE:'x',checkFormToken:()=>'bad',feedbackAvailable:()=>true,issueFormToken:()=>'token',turnstilePassed:async()=>true},
  '@/lib/homebrew':{proposalDeviceKey:()=>'k',proposalLimits:async()=>({limited:false,peak:false}),recordProposalSend:async()=>{},saveProposal:async()=>({})},
  '@/lib/admin-badge':{adminBadgeCount:async()=>0},'@/lib/notice-limit':{noticeTurn:async()=>'send',summaryNotice:()=>({})},'@/lib/push':{proposalPayload:()=>({}),sendPush:async()=>{}},
 });
 const post=()=>route.POST(new NextRequest('https://ilgrimorio.app/api/proposte',{method:'POST',headers:{origin:'https://ilgrimorio.app',host:'ilgrimorio.app','content-type':'application/json'},body:'{}'}));
 assert.equal((await route.GET()).status,403,'off: no token for a visitor');
 assert.equal((await post()).status,403,'off: no proposal from a visitor');
 admin=true;
 assert.equal((await route.GET()).status,200,'off: the administrator can try the form');
 assert.notEqual((await post()).status,403);
 admin=false;on=true;
 assert.equal((await route.GET()).status,200,'on: open to everyone');
 // «Creature originali» above the Bestiario (PROMPT 25, in place of the dark card): the row with «Beta» and the two tiles.
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),ui=require('../components/homebrew/community-ui.tsx');
 const view=(state)=>({visibile:{shown:true,hidden:false,soon:false},'in-arrivo':{shown:false,hidden:true,soon:true},nascosta:{shown:false,hidden:true,soon:false},admin:{shown:true,hidden:true,soon:false}})[state];
 const block=(grimorio,community,counts={grimorio:1,community:0},compact=false)=>renderToStaticMarkup(React.createElement(ui.OriginalsBlock,{counts,parts:{grimorio:view(grimorio),community:view(community)},compact}));
 const both=block('visibile','visibile');
 assert.ok(both.includes('Creature originali')&&both.includes('data-beta-pill')&&both.includes('Vedi tutte · 1 ›'),'the row: title, Beta, «Vedi tutte · N»');
 assert.ok(both.includes('grid-cols-2')&&both.includes('Dalla redazione')&&both.includes('Mostri del Grimorio')&&both.includes('Creati da voi'));
 assert.ok(both.includes('1 creatura ›')&&both.includes('0 creature ›'),'1 creatura / N creature, 0 too');
 assert.ok(both.includes('href="/bestiario/del-grimorio"')&&both.includes('href="/bestiario/creati-da-voi"')&&both.includes('href="/bestiario/creature-originali"')&&both.includes('href="/bestiario/proponi"'));
 const soon=block('in-arrivo','visibile');
 assert.ok(soon.includes('data-tile-state="in-arrivo"')&&soon.includes('href="/in-arrivo/bestiario%3Agrimorio"')&&soon.includes('In arrivo'),'«In arrivo»: dimmed, to the page «in arrivo»');
 assert.ok(soon.includes('Vedi tutte · 0 ›'),'a group «In arrivo» is not counted');
 const communitySoon=block('visibile','in-arrivo');
 assert.ok(communitySoon.includes('href="/in-arrivo/bestiario%3Ahomebrew"')&&communitySoon.includes('href="/bestiario/proponi"'),'community «In arrivo»: «Proponi il tuo» stays');
 const hidden=block('nascosta','visibile');
 assert.ok(!hidden.includes('data-originals-tile="grimorio"')&&hidden.includes('grid-cols-1'),'hidden: no tile');
 assert.equal(block('nascosta','nascosta'),'','both hidden: nothing');
 const onlySoon=block('in-arrivo','in-arrivo');
 assert.ok(!onlySoon.includes('data-originals-row'),'no group shown: no row «Creature originali»');
 assert.ok(block('admin','visibile').includes('Nascosta'),'the administrator sees a hidden group, labelled');
 assert.ok(block('visibile','visibile',{grimorio:1,community:0},true).includes('data-compact=""'),'the computer column');
 console.log('I mostri creati da voi: switch (tests only, never Vercel), chips of damage, conditions, languages and senses (old texts kept), proposals API closed to visitors while off.');
})().catch(error=>{console.error(error);process.exit(1);});
