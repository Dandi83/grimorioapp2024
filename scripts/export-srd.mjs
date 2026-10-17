import { readFileSync, writeFileSync } from 'node:fs';

const data=JSON.parse(readFileSync(new URL('../lib/data/srd-italiano-5.2.1.json',import.meta.url),'utf8'));
const review=JSON.parse(readFileSync(new URL('../lib/data/srd-revisions-20261017.json',import.meta.url),'utf8'));
const unique=[...new Map(data.spells.map(s=>[s.sourceName,s])).values()].sort((a,b)=>a.sourceName.localeCompare(b.sourceName,'it'));
const decode=text=>text.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&#x27;/g,"'").replace(/&amp;/g,'&');
const out=[
  '# GrimorioApp — Trascrizioni integrali SRD italiano 5.2.1','',
  `${unique.length} incantesimi distinti, corrispondenti a ${data.spells.length} schede dell’app. Respirare sott’acqua è presente in due schede con ID differenti.`, '',
  'Questa raccolta comprende tutte le 339 descrizioni distinte del SRD italiano: 242 schede inizialmente vuote, 78 descrizioni preesistenti verificate e 20 nuove schede. Le altre 10 descrizioni preesistenti non sono nel SRD italiano; 39 schede preesistenti sono ancora senza descrizione. Il documento riporta i contenuti preparati, non certifica lo stato di pubblicazione.','',
  `Fonte: ${data.sourceUrl}`,'','## Attribuzione','',data.attribution,'',data.transcriptionNotes,'','## Indice','',
  ...unique.map((s,i)=>`${i+1}. ${s.sourceName}`),
];
for(const s of unique){
  out.push('','---','',`## ${s.sourceName}`,'',s.livello,'',
    `- Tempo di lancio: ${s.tempo_di_lancio}`,`- Gittata: ${s.gittata}`,`- Componenti: ${s.componenti}`,`- Durata: ${s.durata}`,`- Pagine SRD: ${s.pages.join(', ')}`,'');
  for(const part of s.descrizione.split(/(<pre>[\s\S]*?<\/pre>)/g)){
    if(part.startsWith('<pre>'))out.push('```text',decode(part.slice(5,-6)),'```','');
    else{
      const text=decode(part.replace(/<br>/g,'\n').replace(/<\/?b>/g,'**')).trim();
      if(text)out.push(text,'');
    }
  }
}
out.push('','## Descrizioni precedenti escluse dal SRD','',
  'Questi 10 testi sono stati conservati. La revisione non attribuisce loro la licenza o il testo ufficiale del SRD.','',
  ...review.excluded.map(s=>`- ${s.name}`),'');
writeFileSync(new URL('../docs/srd-incantesimi-integrali.md',import.meta.url),out.join('\n')+'\n');
console.log(`[srd] Exported ${unique.length} distinct full transcriptions for ${data.spells.length} app records.`);
