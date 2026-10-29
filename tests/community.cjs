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
 assert.equal(f.writeLanguages({selected:['Draconico','Comune'],extra:'',understandsOnly:true},L),'capisce Comune, Draconico ma non può parlare');
 assert.deepEqual(f.readLanguages('capisce Comune, Draconico ma non può parlare',L).understandsOnly,true,'what the form writes reads back');
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
 console.log('I mostri creati da voi: switch (tests only, never Vercel), chips of damage, conditions, languages and senses (old texts kept), proposals API closed to visitors while off.');
})().catch(error=>{console.error(error);process.exit(1);});
