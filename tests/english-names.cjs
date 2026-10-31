// The official English names of the SRD cards in the search (PROMPT 33): lib/data/nomi-inglesi-srd.json.
// A sample checked by hand on the English PDFs (at least 30 names per type and edition), one name for one card, only
// SRD cards (the ids of the SRD files of the project), only short names (never text), no name of the product identity.
// Run: NODE_OPTIONS=--require=./tests/register-ts.cjs node tests/english-names.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const names=require('../lib/data/nomi-inglesi-srd.json');
const {englishName}=require('../lib/english-names.ts');
const {englishShown,englishOf,namesOf}=require('../lib/english-match.ts');
const {foldIndex,markRange}=require('../lib/highlight.ts');
const {rowsOf,search}=require('../lib/search.ts');
const {withSynonyms,foundInEnglish}=require('../lib/search-insights.ts');
const {searchList}=require('../lib/fuzzy-search.ts');
const read=file=>JSON.parse(fs.readFileSync(`lib/data/${file}`,'utf8'));

// The two PDFs the names were read from (the same files as the SRD data of the project).
assert.equal(names.fonti['2014'].sha256,'2504d2a0abb0a4d491a939be4f17910a2dde0312570ab8d208080225ccf0a1f0');
assert.equal(names.fonti['2024'].sha256,'8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87');
assert.equal(names.fonti['2014'].url,'https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1.pdf');
assert.equal(names.fonti['2024'].url,'https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf');

// Hand-checked sample: Italian card → English name printed in the PDF of its edition.
const SAMPLE={
 '2014':{
  incantesimi:{'aiuto-2014':'Aid','benedizione-2014':'Bless','palla-di-fuoco-2014':'Fireball','dardo-di-fuoco-2014':'Fire Bolt','dissolvi-magie-2014':'Dispel Magic','cono-di-freddo-2014':'Cone of Cold','creare-cibo-e-acqua-2014':'Create Food and Water','faro-di-speranza-2014':'Beacon of Hope','identificare-2014':'Identify','individuazione-dei-pensieri-2014':'Detect Thoughts','intimorire-infernale-2014':'Hellish Rebuke','muro-di-ghiaccio-2014':'Wall of Ice','occhio-arcano-2014':'Arcane Eye','parola-del-potere-uccidere-2014':'Power Word Kill','paura-2014':'Fear','previsione-2014':'Foresight','respirare-sott-acqua-2014':'Water Breathing','risata-incontenibile-2014':'Hideous Laughter','santuario-2014':'Sanctuary','serratura-arcana-2014':'Arcane Lock','simulacro-2014':'Simulacrum','suggestione-2014':'Suggestion','tentacoli-neri-2014':'Black Tentacles','trova-cavalcatura-2014':'Find Steed','vita-falsata-2014':'False Life','volare-2014':'Fly','desiderio-2014':'Wish','ragnatela-2014':'Web','resistenza-2014':'Resistance','bacche-benefiche-2014':'Goodberry','clone-2014':'Clone','giara-magica-2014':'Magic Jar'},
  mostri:{'aboleth-2014':'Aboleth','spia-2014':'Spy','aquila-gigante-2014':'Giant Eagle','balor-2014':'Balor','cacciatore-invisibile-2014':'Invisible Stalker','cavallo-da-guerra-2014':'Warhorse','cinghiale-2014':'Boar','diavolo-d-ossa-2014':'Bone Devil','drago-bianco-cucciolo-2014':'White Dragon Wyrmling','drago-d-argento-giovane-2014':'Young Silver Dragon','drago-di-bronzo-adulto-2014':'Adult Bronze Dragon','drago-nero-antico-2014':'Ancient Black Dragon','elementale-del-fuoco-2014':'Fire Elemental','faina-2014':'Weasel','gigante-delle-tempeste-2014':'Storm Giant','golem-di-ferro-2014':'Iron Golem','iena-gigante-2014':'Giant Hyena','lucertola-gigante-2014':'Giant Lizard','megera-notturna-2014':'Night Hag','millepiedi-gigante-2014':'Giant Centipede','orso-polare-2014':'Polar Bear','scheletro-di-cavallo-da-guerra-2014':'Warhorse Skeleton','scorpione-2014':'Scorpion','tappeto-soffocante-2014':'Rug of Smothering','topo-2014':'Rat','verme-purpureo-2014':'Purple Worm','zombi-2014':'Zombie','fuoco-fatuo-2014':'Will-o’-Wisp','tigre-dai-denti-a-sciabola-2014':'Saber-Toothed Tiger','gorilla-2014':'Ape','sciame-di-insetti-2014':'Swarm of Insects','topo-gigante-2014':'Giant Rat'},
  'oggetti-magici':{'borsa-conservante':'Bag of Holding','anello-di-protezione':'Ring of Protection','mantello-elfico':'Cloak of Elvenkind','stivali-elfici':'Boots of Elvenkind','bacchetta-delle-palle-di-fuoco':'Wand of Fireballs','bacchetta-di-missili-magici':'Wand of Magic Missiles','pozione-di-guarigione':'Potion of Healing','pozione-della-forza-dei-giganti':'Potion of Giant Strength','spada-vorpal':'Vorpal Sword','sacro-vendicatore':'Holy Avenger','tappeto-volante':'Carpet of Flying','scopa-volante':'Broom of Flying','sfera-annientatrice':'Sphere of Annihilation','mazzo-delle-meraviglie':'Deck of Many Things','cubo-di-forza':'Cube of Force','buco-portatile':'Portable Hole','zainetto-pratico':'Handy Haversack','verga-inamovibile':'Immovable Rod','pergamena-magica':'Spell Scroll','pietra-di-ioun':'Ioun Stone','lingua-di-fiamme':'Flame Tongue','spadone-del-gelo':'Frost Brand','arma-1-2-o-3':'Weapon, +1, +2, or +3','scudo-1-2-o-3':'Shield, +1, +2, or +3','armatura-1-2-o-3':'Armor, +1, +2, or +3','corazza-di-scaglie-di-drago':'Dragon Scale Mail','giaco-di-maglia-elfico':'Elven Chain','bastone-dei-magi':'Staff of the Magi','tunica-dell-arcimago':'Robe of the Archmagi','ampolla-di-ferro':'Iron Flask','sfera-della-stirpe-dei-draghi':'Orb of Dragonkind','piuma-magica':'Feather Token'},
 },
 '2024':{
  incantesimi:{'benedizione':'Bless','palla-di-fuoco':'Fireball','aiuto':'Aid','aculeo-mentale':'Mind Spike','animale-messaggero':'Animal Messenger','aura-di-vita':'Aura of Life','camuffare-se-stesso':'Disguise Self','cerchio-magico':'Magic Circle','comando':'Command','contattare-altri-piani':'Contact Other Plane','deflagrazione-occulta':'Eldritch Blast','divinazione':'Divination','evoca-animali':'Conjure Animals','forma-eterea':'Etherealness','glifo-di-interdizione':'Glyph of Warding','i-re-spirare-sott-acqua-2':'Water Breathing','inaridire':'Blight','legame-planare':'Planar Binding','marchio-del-cacciatore':'Hunter’s Mark','muro-di-fuoco':'Wall of Fire','nube-mortale':'Cloudkill','parola-del-potere-guarire':'Power Word Heal','passo-velato':'Misty Step','presagio':'Augury','punizione-divina':'Divine Smite','randello-incantato':'Shillelagh','rimuovi-maledizione':'Remove Curse','scurovisione':'Darkvision','sortilegio':'Hex','tentacoli-neri-di-evard':'Black Tentacles','mano-di-bigby':'Arcane Hand','fiotto-acido':'Acid Splash','volare':'Fly'},
  mostri:{'aboleth':'Aboleth','spia':'Spy','aquila-gigante':'Giant Eagle','azer-sentinella':'Azer Sentinel','boleto-stridente':'Shrieker Fungus','capitano-dei-pirati':'Pirate Captain','cavallo-da-tiro':'Draft Horse','cinghiale-gigante':'Giant Boar','couatl':'Couatl','diavolo-d-ossa':'Bone Devil','drago-bianco-cucciolo':'White Dragon Wyrmling','drago-nero-antico':'Ancient Black Dragon','elementale-dell-acqua':'Water Elemental','falco':'Hawk','gatto':'Cat','golem-di-pietra':'Stone Golem','guardia':'Guard','idra':'Hydra','medusa':'Medusa','orso-mannaro':'Werebear','pipistrello':'Bat','protoplasma-nero':'Black Pudding','rana':'Frog','sahuagin-guerriero':'Sahuagin Warrior','sciame-di-pipistrelli':'Swarm of Bats','sfinge-del-valore':'Sphinx of Valor','squalo-cacciatore':'Hunter Shark','testuggine-dragona':'Dragon Turtle','triceratopo':'Triceratops','wight':'Wight','melma-grigia':'Gray Ooze','cultista-fanatico':'Cultist Fanatic','serpente-velenoso':'Venomous Snake'},
  'oggetti-magici':{'borsa-conservante':'Bag of Holding','anello-di-protezione':'Ring of Protection','mantello-elfico':'Cloak of Elvenkind','stivali-elfici':'Boots of Elvenkind','bacchetta-delle-palle-di-fuoco':'Wand of Fireballs','bacchetta-di-dardi-incantati':'Wand of Magic Missiles','pozioni-di-guarigione':'Potions of Healing','pozione-della-forza-dei-giganti':'Potion of Giant Strength','spada-vorpal':'Vorpal Sword','sacro-vendicatore':'Holy Avenger','tappeto-volante':'Carpet of Flying','scopa-volante':'Broom of Flying','sfera-annientatrice':'Sphere of Annihilation','mazzo-delle-meraviglie':'Mysterious Deck','cubo-di-forza':'Cube of Force','buco-portatile':'Portable Hole','zainetto-pratico':'Handy Haversack','verga-inamovibile':'Immovable Rod','pergamena-magica':'Spell Scroll','pietra-di-ioun':'Ioun Stone','lingua-di-fiamme':'Flame Tongue','spadone-del-gelo':'Frost Brand','arma-1-2-o-3':'Weapon, +1, +2, or +3','scudo-1-2-o-3':'Shield, +1, +2, or +3','armatura-1-2-o-3':'Armor, +1, +2, or +3','armatura-a-piastre-della-forma-eterea':'Plate Armor of Etherealness','giaco-di-maglia-elfico':'Elven Chain','bastone-dei-magi':'Staff of the Magi','tunica-dell-arcimago':'Robe of the Archmagi','sfera-del-drago':'Dragon Orb','piuma-di-quaal':'Feather Token','cappello-dei-molti-incantesimi':'Hat of Many Spells'},
 },
};
for(const edition of ['2014','2024'])for(const [kind,pairs] of Object.entries(SAMPLE[edition])){
  assert.ok(Object.keys(pairs).length>=30,`${edition} ${kind}: at least 30 names checked by hand`);
  for(const [id,en] of Object.entries(pairs))assert.equal(englishName(kind,edition,id),en,`${edition} ${kind} ${id}`);
}
// Equipment (PROMPT 35): at least 30 per edition checked by hand on the tables of the English PDFs (cost, weight, damage).
const EQUIPMENT={
 '2014':{armi:{'spada-lunga':'Longsword','ascia':'Handaxe','ascia-bipenne':'Greataxe','ascia-da-battaglia':'Battleaxe','balestra-leggera':'Crossbow, light','balestra-a-mano':'Crossbow, hand','pugnale':'Dagger','stocco':'Rapier','mazza-chiodata':'Morningstar','falcione':'Glaive','bastone-ferrato':'Quarterstaff','rete':'Net'},
  armature:{'cotta-di-maglia':'Chain mail','giaco-di-maglia':'Chain shirt','corazza-a-strisce':'Splint','armatura-a-piastre':'Plate','cuoio-borchiato':'Studded leather','mezza-armatura':'Half plate','scudo':'Shield'},
  avventura:{'acciarino-con-pietra-focaia':'Tinderbox','corda':'Rope, hempen (50 feet)','corda-di-seta':'Rope, silk (50 feet)','razioni':'Rations (1 day)','dotazione-da-avventuriero':'Dungeoneer’s Pack','dotazione-da-scassinatore':'Burglar’s Pack','lanterna-schermabile':'Lantern, hooded','borsa-del-guaritore':'Healer’s kit','piede-di-porco':'Crowbar','triboli':'Caltrops (bag of 20)','gavetta':'Mess kit','chiodo-da-rocciatore':'Piton','cote-per-affilare':'Whetstone','focus-arcano':'Arcane focus'},
  strumenti:{'arnesi-da-scasso':'Thieves’ tools','borsa-da-erborista':'Herbalism kit','trucchi-per-il-camuffamento':'Disguise kit','strumenti-da-inventore':'Tinker’s tools','ciaramella':'Shawm','viola':'Viol','dadi':'Dice set'}},
 '2024':{armi:{'spada-lunga':'Longsword','ascia':'Handaxe','balestra-leggera':'Light Crossbow','balestra-a-mano':'Hand Crossbow','balestra-pesante':'Heavy Crossbow','piccone-da-guerra':'War Pick','martello-leggero':'Light Hammer','moschetto':'Musket','pistola':'Pistol','tridente':'Trident','cerbottana':'Blowgun'},
  armature:{'cotta-di-maglia':'Chain Mail','imbottita':'Padded Armor','cuoio':'Leather Armor','pelle':'Hide Armor','corazza-a-strisce':'Splint Armor','armatura-a-piastre':'Plate Armor','corazza-di-piastre':'Breastplate'},
  avventura:{'acciarino-con-pietra-focaia':'Tinderbox','corda':'Rope','razioni':'Rations','dotazione-da-avventuriero':'Dungeoneer’s Pack','pergamena-magica':'Spell Scroll','lanterna-a-lente-sporgente':'Lantern, Bullseye','spago':'String','mappa':'Map','rete':'Net','tunica':'Robe','abiti-da-viaggiatore':'Clothes, Traveler’s','pozione-di-guarigione':'Potion of Healing'},
  strumenti:{'arnesi-da-scasso':'Thieves’ Tools','gioco':'Gaming Set','strumento-musicale':'Musical Instrument','scorte-da-alchimista':'Alchemist’s Supplies','utensili-da-cuoco':'Cook’s Utensils','sostanze-da-avvelenatore':'Poisoner’s Kit'}},
};
for(const edition of ['2014','2024']){
  const pairs=Object.entries(EQUIPMENT[edition]).flatMap(([kind,table])=>Object.entries(table).map(([id,en])=>[kind,id,en]));
  assert.ok(pairs.length>=30,`${edition} equipment: at least 30 names checked by hand`);
  for(const [kind,id,en] of pairs)assert.equal(englishName(kind,edition,id),en,`${edition} ${kind} ${id}`);
}
// Equipment: only the cards of the project's SRD files, every one with its name (no mounts or vehicles: no cards).
{
  const weapons=read('srd-weapons-it.json').armi,armor=read('srd-armor-it.json').armature;
  const {gearListRows}=require('../lib/adventuring-gear-editions.ts'),{toolListRows}=require('../lib/tools-editions.ts');
  const gear=gearListRows(),tools=toolListRows();
  for(const edition of ['2014','2024']){
    const ids={armi:weapons.filter(w=>w[edition]).map(w=>w.id),armature:armor.filter(a=>a[edition]).map(a=>a.id),avventura:gear[edition].map(r=>r.id),strumenti:tools[edition].map(r=>r.id)};
    for(const [kind,list] of Object.entries(ids)){
      assert.deepEqual(Object.keys(names[edition][kind]).sort(),[...list].sort(),`${edition} ${kind}: every SRD item, nothing else`);
    }
    assert.ok(gear[edition].every(row=>row.en),'the rows of the list carry the English name');
    assert.ok(tools[edition].every(row=>row.en));
  }
}

// Conditions, classes and subclasses: all of them.
const CONDITIONS={accecato:'Blinded',affascinato:'Charmed',afferrato:'Grappled',assordato:'Deafened',avvelenato:'Poisoned',incapacitato:'Incapacitated',indebolimento:'Exhaustion',invisibile:'Invisible',paralizzato:'Paralyzed',pietrificato:'Petrified','privo-di-sensi':'Unconscious',prono:'Prone',spaventato:'Frightened',stordito:'Stunned',trattenuto:'Restrained'};
for(const [it,en] of Object.entries(CONDITIONS)){assert.equal(englishName('condizioni','2024',`condizioni-${it}`),en);assert.equal(englishName('condizioni','2014',`condizioni-${it}-2014`),en);}
const CLASSES={barbaro:'Barbarian',bardo:'Bard',chierico:'Cleric',druido:'Druid',guerriero:'Fighter',ladro:'Rogue',mago:'Wizard',monaco:'Monk',paladino:'Paladin',ranger:'Ranger',stregone:'Sorcerer',warlock:'Warlock'};
for(const [it,en] of Object.entries(CLASSES))for(const edition of ['2014','2024'])assert.equal(englishName('classi',edition,it),en);
assert.deepEqual(names['2014'].sottoclassi,{barbaro:'Path of the Berserker',bardo:'College of Lore',chierico:'Life Domain',druido:'Circle of the Land',guerriero:'Champion',ladro:'Thief',mago:'School of Evocation',monaco:'Way of the Open Hand',paladino:'Oath of Devotion',ranger:'Hunter',stregone:'Draconic Bloodline',warlock:'The Fiend'});
assert.deepEqual(names['2024'].sottoclassi,{barbaro:'Path of the Berserker',bardo:'College of Lore',chierico:'Life Domain',druido:'Circle of the Land',guerriero:'Champion',ladro:'Thief',mago:'Evoker',monaco:'Warrior of the Open Hand',paladino:'Oath of Devotion',ranger:'Hunter',stregone:'Draconic Sorcery',warlock:'Fiend Patron'});

// Only SRD cards: every id is a card of the SRD files of its edition, every SRD card of those files has its name
// except the ones listed without a match.
const srd={
 '2014':{incantesimi:read('srd-spells-5.1-it.json').records.map(r=>r.spell.id),mostri:read('srd-monsters-5.1-it.json').records.map(r=>r.monster.id),'oggetti-magici':read('srd-magic-items-5.1-it.json').oggetti.map(o=>o.id),condizioni:[...read('srd-conditions-5.1-it.json'),...read('srd-conditions-5.1-traduzione.json')].map(c=>c.id)},
 '2024':{incantesimi:read('srd-italiano-5.2.1.json').spells.map(s=>s.id).filter(id=>!(id in read('merged-spell-ids.json'))),mostri:[...read('srd-monsters-5.2.1-it.json').records,...read('srd-animals-5.2.1-it.json').records].map(r=>r.monster.id),'oggetti-magici':read('srd-magic-items-5.2.1-it.json').oggetti.map(o=>o.id),condizioni:read('srd-conditions-5.2.1-it.json').map(c=>c.id)},
};
const counts={};
for(const edition of ['2014','2024']){
  for(const [kind,ids] of Object.entries(srd[edition])){
    const table=names[edition][kind],without=names.senzaCorrispondenza[edition][kind]??[];
    assert.deepEqual(Object.keys(table).filter(id=>!ids.includes(id)),[],`${edition} ${kind}: only SRD cards`);
    assert.deepEqual(ids.filter(id=>!(id in table)).sort(),[...without].sort(),`${edition} ${kind}: every SRD card has its name, or is listed without a match`);
    counts[`${edition} ${kind}`]=Object.keys(table).length;
  }
  for(const [kind,table] of Object.entries(names[edition])){
    // One name for one card.
    const values=Object.values(table),twice=values.filter((value,at)=>values.indexOf(value)!==at);
    assert.deepEqual(twice,[],`${edition} ${kind}: no English name on two cards`);
    // Only a name: short, a capital first, no full stop, no sentence.
    for(const value of values)assert.match(value,/^[A-Z][A-Za-z0-9 ,’'()+/-]{0,58}$/,`${edition} ${kind}: «${value}» is a name`);
  }
}
// Never a name of the product identity, never a card of ours (NO SRD summaries, homebrew).
const ALL=JSON.stringify([names['2014'],names['2024']]);
for(const word of ['Mind Flayer','Beholder','Illithid','Tasha','Mordenkainen','Bigby','Melf','Leomund','Otiluke','Otto','Drawmij','Evard','Tenser','Nystul','Rary','Yolande','Strahd','Tiamat','Bahamut','Githyanki','Displacer','Mind Sliver'])assert.ok(!ALL.includes(word),`no «${word}»`);
assert.equal(englishName('incantesimi','2024','scheggia-della-mente'),undefined,'an original summary (not SRD) has no English name');
assert.equal(englishName('incantesimi','2014','benedizione'),undefined,'the id of the other edition gives nothing');
assert.equal(englishName('mostri','2024','toString'),undefined,'no inherited key');
for(const edition of ['2014','2024'])for(const kind of ['armi','armature','avventura','strumenti'])counts[`${edition} ${kind}`]=Object.keys(names[edition][kind]).length;
console.log('English names per type and edition:',JSON.stringify(counts),'classes 12+12, subclasses 12+12');

// The lists of a section: «bless» finds Benedizione and says «in inglese: Bless»; the Italian name searched says nothing.
const spells=[{nome:'Benedizione',en:'Bless'},{nome:'Palla di fuoco',en:'Fireball'},{nome:'Vuoto mentale',en:'Mind Blank'},{nome:'Scheggia della mente'}];
const find=query=>searchList(spells,query,row=>namesOf(row.nome,row.en),{settled:true}).exact.map(row=>row.nome);
assert.deepEqual(find('bless'),['Benedizione']);assert.deepEqual(find('fireball'),['Palla di fuoco']);assert.deepEqual(find('mind'),['Vuoto mentale']);
// The line «in inglese» with the letters found (PROMPT 35): start and length on the searched form of the name.
const marked=(shown)=>{if(!shown)return undefined;const r=markRange(shown.name,shown.start,shown.length);return r?shown.name.slice(0,r[0])+'['+shown.name.slice(r[0],r[1])+']'+shown.name.slice(r[1]):shown.name;};
assert.equal(marked(englishShown('Benedizione','Bless','bless')),'[Bless]');
assert.equal(marked(englishShown('Dardo di fuoco','Fire Bolt','fire')),'[Fire] Bolt');
assert.equal(marked(englishShown('Palla di fuoco','Fireball','fire')),'[Fire]ball','start of a word');
assert.equal(marked(englishShown('Luminescenza','Faerie Fire','fire')),'Faerie [Fire]','a word in the middle');
assert.equal(marked(englishShown('Luminescenza','Faerie Fire','fire',{wordStart:true})),'Faerie [Fire]');
assert.equal(marked(englishShown('Palla di fuoco','Fireball','ball')),'Fire[ball]','inside a word, as the lists search');
assert.equal(englishShown('Palla di fuoco','Fireball','ball',{wordStart:true}),undefined,'the Home: only at the start of a word');
assert.equal(marked(englishShown('Spia','Spy','SPY')),'[Spy]','capitals ignored');
assert.equal(marked(englishShown('Arnesi da scasso','Thieves’ Tools','thieves tools')),'[Thieves’ Tools]','apostrophe as a space');
assert.equal(marked(englishShown('Arnesi da scasso','Thieves’ Tools','tools')),'Thieves’ [Tools]','after the apostrophe, the letters as written');
assert.equal(marked(englishShown('Strumenti da fabbro','Smith’s Tools','smith')),'[Smith]’s Tools');
assert.equal(marked(englishShown('Esempio','Évocation','evoc')),'[Évoc]ation','accents ignored');
assert.equal(marked(englishShown('Spada lunga','Longsword','longsowrd',{settled:true})),'Longsword','a typo: found, nothing marked');
assert.equal(englishShown('Palla di fuoco','Fireball','palla'),undefined,'the Italian name only');
assert.equal(englishShown('Scheggia della mente',undefined,'mind'),undefined);
assert.equal(englishShown('Lich','Lich','lich'),undefined,'the same name: no line');
assert.equal(englishShown('Ascia','Handaxe','ascia'),undefined);
// Both names found: the line too («cotta» → Italian; «mail» → English): a query in both languages marks both.
assert.equal(marked(englishShown('Mail da prova','Chain mail','mail')),'Chain [mail]');
assert.equal(marked(englishOf('Benedizione',['Bless','Blessing'],'bless')),'[Bless]','the first English name found');
assert.deepEqual(foldIndex('Thieves’ Tools').slice(7,10),[7,9,10],'the apostrophe stands for the space, then T and o');
assert.deepEqual(foldIndex(' A  b'),[1,2,4]);

// The index of the Home: the English names are rows of their own, found and marked; a synonym of the reserved area
// written the same way wins and the English name leaves the index.
const index={v:1,sections:[{k:'incantesimi',t:'Incantesimi'},{k:'mostri',t:'Mostri'}],rows:[[0,'Benedizione','Ammaliamento · liv. 1','/spell/benedizione','/spell/benedizione-2014'],[0,'Palla di fuoco','Invocazione · liv. 3','/spell/palla-di-fuoco'],[0,'Vuoto mentale','Abiurazione · liv. 8','/spell/vuoto-mentale'],[1,'Spia','Umanoide · GS 1','/mostro/spia'],[0,'Bestia magica','Trasmutazione · liv. 2','/spell/bestia']],en:[['Bless',0],['Fireball',1],['Mind Blank',2],['Spy',3]]};
const hits=query=>search(index,rowsOf(index),query,{settled:true}).flatMap(group=>group.rows);
assert.deepEqual(hits('bless').map(row=>[row.nome,row.english,row.alias,row.start]),[['Benedizione',true,'Bless',-1]]);
assert.deepEqual(hits('spy').map(row=>[row.nome,row.alias]),[['Spia','Spy']]);
assert.deepEqual(hits('fire').map(row=>row.nome),['Palla di fuoco']);
assert.deepEqual(hits('mind').map(row=>[row.nome,row.alias]),[['Vuoto mentale','Mind Blank']]);
// The Italian name found first: no «in inglese».
assert.deepEqual(hits('benedizione').map(row=>[row.nome,row.english]),[['Benedizione',undefined]]);
assert.equal(hits('benedizione bless').length,0);
const withSyn=withSynonyms(index,[{query:'bless',href:'/spell/bestia'}]);
assert.deepEqual(withSyn.en.map(([name])=>name),['Fireball','Mind Blank','Spy']);
assert.deepEqual(search(withSyn,rowsOf(withSyn),'bless',{settled:true}).flatMap(group=>group.rows).map(row=>[row.nome,row.english]),[['Bestia magica',undefined]]);
assert.deepEqual(withSynonyms(index,[]),index,'no synonym, the index as it is');
// «Ricerche senza risultato»: a word found now by an English name leaves the list; the others stay.
assert.equal(foundInEnglish('fireball',index),true);assert.equal(foundInEnglish('zzqx',index),false);assert.equal(foundInEnglish('palla',index),false);
console.log('English names: sample checked by hand, only SRD cards, one name per card, search of the lists and of the Home, synonyms first.');
