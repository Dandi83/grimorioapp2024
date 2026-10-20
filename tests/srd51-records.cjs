const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const data=require('../lib/data/srd-monsters-5.1-it.json');
const links=require('../lib/data/monster-edition-links.json').links;
const animals=new Set(require('../lib/data/srd-animal-ids.json'));
const ids2024=new Set([...require('../lib/data/srd-monsters-5.2.1-it.json').records,...require('../lib/data/srd-animals-5.2.1-it.json').records].map(r=>r.monster.id));

// Official XP for each challenge rating (SRD 5.1, "Punti esperienza per grado di sfida").
const XP={'0':[0,10],'1/8':[25],'1/4':[50],'1/2':[100],'1':[200],'2':[450],'3':[700],'4':[1100],'5':[1800],'6':[2300],'7':[2900],'8':[3900],'9':[5000],'10':[5900],'11':[7200],'12':[8400],'13':[10000],'14':[11500],'15':[13000],'16':[15000],'17':[18000],'18':[20000],'19':[22000],'20':[25000],'21':[33000],'22':[41000],'23':[50000],'24':[62000],'30':[155000]};
const seen=new Set();
for(const record of data.records){
 const m=record.monster;
 assert.ok(m.id.endsWith('-2014')&&!ids2024.has(m.id),`${m.id}: a 2014 address`);
 assert.ok(!seen.has(m.id),`${m.id}: no duplicate sheet`);seen.add(m.id);
 assert.equal(crypto.createHash('sha256').update(record.sourceText).digest('hex'),record.sourceSha256,`${m.id}: source text fingerprint`);
 if(!record.adaptation)assert.ok(record.sourceText.startsWith(record.sourceName),`${m.id}: source starts with its name`); // variants quote their base sheet
 assert.ok(XP[m.grado_sfida]?.includes(Number(m.px.replace(/\./g,''))),`${m.id}: XP ${m.px} matches challenge ${m.grado_sfida}`);
 const hp=m.punti_ferita.match(/^(\d+) \((\d+)d(\d+)(?: ([+-]) (\d+))?\)$/);
 assert.ok(hp,`${m.id}: hit points "${m.punti_ferita}"`);
 const average=Math.floor(Number(hp[2])*(Number(hp[3])+1)/2)+(hp[5]?Number(hp[5])*(hp[4]==='-'?-1:1):0);
 assert.equal(Number(hp[1]),average,`${m.id}: hit points are the dice average`);
 for(const a of ['forza','destrezza','costituzione','intelligenza','saggezza','carisma'])assert.ok(m[a]>=1&&m[a]<=30,`${m.id}: ${a}`);
 assert.ok(/^\d+/.test(m.classe_armatura)&&m.velocita&&m.sensi,`${m.id}: armor class, speed and senses`);
 assert.ok(['Minuscola','Piccola','Media','Grande','Enorme','Mastodontica'].includes(m.taglia),`${m.id}: size category`);
 for(const key of ['tratti','azioni','reazioni','azioni_leggendarie'])
  assert.ok(!/<(?!\/?(?:strong|em|br)>)/.test(m[key]),`${m.id}: only bold, italic and line breaks in ${key}`);
 const link=links[m.id];
 if(link)assert.ok(ids2024.has(link.id2024),`${m.id}: linked 2024 sheet exists`);
 if(link&&animals.has(link.id2024))assert.ok(animals.has(m.id),`${m.id}: same collection as its 2024 sheet`);
}
console.log(`SRD 5.1 records: ${data.records.length} sheets with source fingerprints, dice-average hit points, XP by challenge, 2014 addresses, links and collections verified.`);
