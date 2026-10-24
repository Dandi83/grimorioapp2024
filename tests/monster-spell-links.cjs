const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const cache=new Map();
let selected;
const deps={
 'next/image':{__esModule:true,default:()=>{throw Error('Public creature artwork must remain disabled')}},
 'next/link':{__esModule:true,default:({children,...props})=>React.createElement('a',props,children)},
 'next/navigation':{notFound:()=>{throw Error('Not found')}},
 '@/components/back-button':{BackButton:()=>null},'@/components/admin-edit/admin-edit-button':{AdminEditButton:()=>null,AdminEditPencil:()=>null},
 '@/components/share-button':{ShareButton:()=>null},'@/components/feedback/report-link':{ReportLink:()=>null},
 '@/components/favorite-button':{FavoriteButton:()=>null},
 '@/lib/monsters':{getMonsterById:async()=>selected},'@/lib/spell-reference-catalog':{getSpellReferenceCatalog:async()=>undefined},
 '@/lib/section-view':{visibleCards:async(k,l)=>l,bestiaryList:async l=>l,markedCards:async(k,l)=>l,cardHidden:async()=>false,cardsOut:async()=>[],sectionView:async()=>({admin:false,hidden:[],hiddenParts:[],hiddenCards:[]}),sectionsOut:async()=>[],partsOut:async()=>[],linksOut:async()=>[],partState:async()=>({shown:true,hidden:false}),editionCard:async()=>false,pageEditions:async()=>['2024','2014']},'@/components/sections/hidden-card-bar':{HiddenCardBar:()=>null},'@/components/homebrew/homebrew-sheet':{HomebrewLabel:()=>null,HomebrewNote:()=>null},'@/lib/homebrew-types':{authorLine:()=>''},'@/components/sections/part-block':{HiddenPartBar:()=>null,PartBlock:({children})=>children},
};
function load(relative){
 const filename=path.resolve(relative);
 if(cache.has(filename))return cache.get(filename).exports;
 const mod={exports:{}};cache.set(filename,mod);
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const local=id=>{
  if(id in deps)return deps[id];
  if(id.startsWith('@/')||id.startsWith('./')){
   const file=id.startsWith('@/')?path.resolve(id.slice(2)):path.resolve(path.dirname(filename),id);
   for(const extension of ['.ts','.tsx'])if(fs.existsSync(file+extension))return load(file+extension);
  }
  return createRequire(filename)(id);
 };
 new Function('require','module','exports',code)(local,mod,mod.exports);return mod.exports;
}
(async()=>{
 const helpers=load('lib/spell-references.ts');
 const ids=['individuazione-dei-pensieri','dominare-mostri','spostamento-planare'];
 const html='<strong>Incantesimi.</strong> Lancia senza componenti.<br><br>A volontà: Individuazione dei pensieri.<br>1 volta al giorno ciascuno: Dominare mostri, Spostamento planare (solo su se stesso).';
 assert.deepEqual(helpers.findReferencedSpells(html).map(s=>s.id).sort(),[...ids].sort());
 for(const text of ['La paura svanisce e può volare.','A volontà: nome inventato.','La creatura parla di Dominare mostri.'])assert.equal(helpers.findReferencedSpells(text).length,0,text);
 for(const text of ['<strong>A volontà:</strong> Individuazione dei pensieri.','A volontà:<br>Individuazione dei pensieri.','1/giorno ciascuno: Dominare mostri; Spostamento planare (solo su se stesso).'])assert.ok(helpers.findReferencedSpells(text).length>0,text);
 const italic='<strong>A volontà:</strong> <em>invisibilità</em>';
 assert.equal(helpers.formatMonsterSpellLists(italic),italic,'existing source emphasis stays exact');
 assert.equal(helpers.formatMonsterSpellLists(helpers.formatMonsterSpellLists(html)),helpers.formatMonsterSpellLists(html),'formatting is idempotent');
 const {AdminMonsterPreview}=load('components/admin-monster-preview.tsx');
 const pageModule=load('app/mostro/[id]/page.tsx');
 const page=pageModule.default;
 selected={id:'guardiano-incantatore-test',nome:'Guardiano incantatore',edizione:'2024',tipo:'Costrutto',taglia:'Media',allineamento:'neutrale',classe_armatura:'15',punti_ferita:'30',velocita:'9 m',grado_sfida:'2',px:'450',forza:10,destrezza:10,costituzione:10,intelligenza:16,saggezza:10,carisma:10,azioni:html,iniziativa:'+4 (14)',bonus_competenza:'+3',attrezzatura:'Corazza',azioni_bonus:'<strong>Passo.</strong> Si sposta.',gs_num:2};
 for(const legacy of [false,true]){
  selected.edizione=legacy?'2014':'2024';
  const preview=renderToStaticMarkup(React.createElement(AdminMonsterPreview,{monster:selected,legacy}));
  const publicHtml=renderToStaticMarkup(await page({params:Promise.resolve({id:selected.id})}));
  // Same sheet component: the editor preview shows exactly the public sheet body.
  const body=html=>html.slice(html.indexOf('<div class="grid grid-cols-3'),html.lastIndexOf('</section>'));
  assert.ok(body(preview).length>1000);assert.equal(body(preview),body(publicHtml),'preview and public sheet are identical');
  for(const output of [preview,publicHtml]){
   for(const id of ids)assert.equal(output.includes(`href="/spell/${id}"`),!legacy,'preview/public edition parity');
   for(const text of ['+4','(14)','bonus di competenza +3','Corazza','Passo.'])assert.ok(output.replace(/<[^>]+>/g,'').includes(text),text);
   assert.ok(output.includes('Equipaggiamento'),'new and existing creatures use the requested label');
   assert.ok(!output.includes('Attrezzatura'),'old label is no longer displayed');
   assert.ok(!output.includes('hero-bestiario.webp')&&!output.includes('Illustrazione ufficiale')&&!output.includes('/_next/image'),'no illustration or fallback photo');
   assert.ok(output.includes('solo su se stesso'),'casting qualification preserved');
  }
 }
 assert.deepEqual((await pageModule.generateMetadata({params:Promise.resolve({id:selected.id})})).openGraph.images,[],'shared cards do not advertise removed artwork');
 for(const filename of ['srd-monsters-5.2.1-it.json','srd-animals-5.2.1-it.json','srd-monsters-5.1-it.json'])for(const {monster} of require('../lib/data/'+filename).records)for(const field of ['tratti','azioni','azioni_bonus','reazioni','azioni_leggendarie']){
  const value=monster[field]||'';
  assert.equal(helpers.formatMonsterSpellLists(value).replace(/<[^>]*>/g,''),value.replace(/<[^>]*>/g,''),`${monster.id}.${field}: rendering must preserve text`);
 }
 console.log('Creature spell links: unformatted casting lists, punctuation, qualifiers, existing sources, preview/public parity, optional stats and 2014 isolation passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
