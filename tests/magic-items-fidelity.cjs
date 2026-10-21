// Fidelity of the magic items to the Italian SRD, checked against a second, independent extraction:
// the plain `pdftotext -raw` text of the same pages (tests/fixtures/magic-items-raw-*.txt.gz, written by
// scripts/transcribe-srd-magic-items.py --raw). The transcription reads the PDF word by word with fonts and
// coordinates; pdftotext follows the content stream. Per item: shared 5-word sequences (lower case, no
// hyphenation, spaces or punctuation), word counts, every number in both directions, table rows.
// `node tests/magic-items-fidelity.cjs --report` prints the full list.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const zlib=require('node:zlib');

const EDITIONS={
 '2024':{data:'lib/data/srd-magic-items-5.2.1-it.json',raw:'tests/fixtures/magic-items-raw-5.2.1.txt.gz',first:237,
  footer:/^(System Reference Document 5\.2\.1|\d{3})$/,stops:[],count:258},
 '2014':{data:'lib/data/srd-magic-items-5.1-it.json',raw:'tests/fixtures/magic-items-raw-5.1.txt.gz',first:237,
  footer:/^Rivendita vietata\..*Systems Reference Document 5\.1 \d{3}$/,stops:['Oggetti magici senzienti'],count:240},
};
const THRESHOLD=0.95;

function words(text){
 return text.toLowerCase().replace(/­/g,'').replace(/\*/g,'').replace(/-\n(?=\p{Ll})/gu,'').replace(/[-–—]/g,'')
  .match(/[\p{L}\p{N}]+/gu)||[];
}
function shingles(list){const out=new Set();for(let i=0;i+5<=list.length;i++)out.add(list.slice(i,i+5).join(' '));return out;}
// Numbers as printed: dice (2d6), signed bonuses (+2), decimals (1,5), ranges split into their ends.
function numbers(text){
 const out=new Map();
 for(const m of text.replace(/\*/g,'').replace(/−/g,'-').matchAll(/[+-]?\d+(?:[.,]\d+)*(?:d\d+)?/g)){
  const key=m[0].replace(/^-(?=\d)/,'');out.set(key,(out.get(key)||0)+1);
 }
 return out;
}
// A table as laid out on the page: halves side by side are read across, a header printed again
// at the top of the next column counts again.
function tableText(b){
 const parts=[];
 if(b.title)parts.push(b.title);
 const left=b.affiancata?b.rows.slice(0,b.affiancata):b.rows,right=b.affiancata?b.rows.slice(b.affiancata):[];
 const header=b.affiancata?[...b.header,...b.header]:b.header;
 for(let i=0;i<(b.intestazioniStampate||1);i++)parts.push(header.join(' '));
 left.forEach((r,i)=>parts.push([...r,...(right[i]||[])].join(' ')));
 for(const n of b.notes||[])parts.push(n);
 return parts.join('\n');
}
// Tables printed in the middle of another item's text: placed by coordinates in their own item,
// compared with the raw text of the item where pdftotext prints them.
const PRINTED_ELSEWHERE={'2024':{"Leve dell'apparatus del granchio":'Arco energetico'},'2014':{}};
function itemText(item,edition,items){
 const parts=[item.nome,item.rigaTipo];
 const moved=PRINTED_ELSEWHERE[edition]||{};
 for(const b of item.blocchi){
  if(b.kind==='table'){if(!moved[b.title])parts.push(tableText(b));}
  else if(b.kind==='statblock')parts.push(b.lines.join('\n'));
  else parts.push((b.label?b.label+' ':'')+b.text);
 }
 for(const other of items||[])for(const b of other.blocchi)
  if(b.kind==='table'&&moved[b.title]===item.nome)parts.push(tableText(b));
 return parts.join('\n');
}
function rawPages(edition){
 const cfg=EDITIONS[edition];
 const pages=zlib.gunzipSync(fs.readFileSync(cfg.raw)).toString('utf8').split('\f');
 return pages.map(page=>page.split('\n').filter(line=>!cfg.footer.test(line.trim())).join('\n'));
}
// Cut the raw text into items: each item starts at its printed name followed by its type line.
function segments(edition,items){
 const cfg=EDITIONS[edition];
 const pages=rawPages(edition);
 const tokens=[],pageOf=[];
 pages.forEach((page,i)=>{const list=words(page);for(const w of list){tokens.push(w);pageOf.push(cfg.first+i);}});
 const find=(needle,from)=>{
  outer:for(let i=from;i+needle.length<=tokens.length;i++){for(let j=0;j<needle.length;j++)if(tokens[i+j]!==needle[j])continue outer;return i;}
  return -1;
 };
 let cursor=find(words('Oggetti magici A–Z'),0);
 assert.ok(cursor>=0,edition+': heading not found in the raw text');
 const starts=[];
 for(const item of items){
  const needle=words(item.nome+' '+item.rigaTipo).slice(0,words(item.nome).length+2);
  const at=find(needle,cursor);
  starts.push(at);
  if(at>=0)cursor=at+1;
 }
 const stops=cfg.stops.map(s=>find(words(s),0)).filter(i=>i>=0);
 return items.map((item,i)=>{
  if(starts[i]<0)return null;
  let end=i+1<items.length&&starts[i+1]>=0?starts[i+1]:tokens.length;
  for(const stop of stops)if(stop>starts[i]&&stop<end)end=stop;
  return {tokens:tokens.slice(starts[i],end),page:pageOf[starts[i]]};
 });
}

function check(edition){
 const cfg=EDITIONS[edition];
 const data=JSON.parse(fs.readFileSync(cfg.data,'utf8'));
 const items=data.oggetti;
 const segs=segments(edition,items);
 const results=[];
 items.forEach((item,i)=>{
  const seg=segs[i];
  if(!seg){results.push({item,missing:true});return;}
  const ours=words(itemText(item,edition,items)),theirs=seg.tokens;
  const a=shingles(ours),b=shingles(theirs);
  let shared=0;for(const s of a)if(b.has(s))shared++;
  const inRaw=a.size?shared/a.size:1,inOurs=b.size?shared/b.size:1;
  results.push({item,page:seg.page,inRaw,inOurs,similarity:Math.min(inRaw,inOurs),lengthRatio:ours.length/Math.max(1,theirs.length),words:ours.length,rawWords:theirs.length});
 });
 return {items,results,segs};
}
// Numbers of an item in the raw text: the raw lines between its name and the next item's name.
function rawNumbersByItem(edition,items){
 const cfg=EDITIONS[edition];
 const lines=rawPages(edition).join('\n').split('\n');
 const norm=s=>words(s).join(' ');
 const out=[];let cursor=lines.findIndex(l=>l.trim()==='Oggetti magici A–Z');
 const starts=items.map(item=>{
  const name=norm(item.nome);
  for(let i=cursor+1;i<lines.length;i++){
   // Names may be printed over two lines.
   const one=norm(lines[i]),two=norm(lines[i]+' '+(lines[i+1]||''));
   if(one===name||two===name||two.startsWith(name+' '+norm(item.rigaTipo).split(' ')[0])&&one.length<name.length+1){cursor=i;return i;}
  }
  return -1;
 });
 const stops=cfg.stops.map(s=>lines.findIndex(l=>l.trim()===s)).filter(i=>i>=0);
 items.forEach((item,i)=>{
  if(starts[i]<0){out.push(null);return;}
  let end=i+1<items.length&&starts[i+1]>=0?starts[i+1]:lines.length;
  for(const stop of stops)if(stop>starts[i]&&stop<end)end=stop;
  out.push(numbers(lines.slice(starts[i],end).join('\n')));
 });
 return out;
}
function diffNumbers(a,b){
 const out=[];
 for(const [k,v] of a){const w=b.get(k)||0;if(v>w)out.push(`${k}×${v-w}`);}
 return out;
}

const report=process.argv.includes('--report');
const summary={};
for(const edition of Object.keys(EDITIONS)){
 const {items,results}=check(edition);
 assert.equal(items.length,EDITIONS[edition].count,edition+' count');
 const missing=results.filter(r=>r.missing).map(r=>r.item.nome);
 const low=results.filter(r=>!r.missing&&(r.similarity<THRESHOLD||r.lengthRatio<0.9||r.lengthRatio>1.1));
 const mean=results.filter(r=>!r.missing).reduce((s,r)=>s+r.similarity,0)/results.length;
 const rawNumbers=rawNumbersByItem(edition,items);
 const numberIssues=[];
 items.forEach((item,i)=>{
  if(!rawNumbers[i]){numberIssues.push({nome:item.nome,error:'name not found'});return;}
  const ours=numbers(itemText(item,edition,items));
  const onlyOurs=diffNumbers(ours,rawNumbers[i]),onlyRaw=diffNumbers(rawNumbers[i],ours);
  if(onlyOurs.length||onlyRaw.length)numberIssues.push({nome:item.nome,onlyOurs,onlyRaw});
 });
 summary[edition]={mean,missing,low:low.map(r=>({nome:r.item.nome,pagina:r.item.pagina,similarity:+r.similarity.toFixed(3),inRaw:+r.inRaw.toFixed(3),inOurs:+r.inOurs.toFixed(3),lengthRatio:+r.lengthRatio.toFixed(2)})),numberIssues};
 if(report){
  console.log(`\n== ${edition}: ${items.length} oggetti, similarità media ${(mean*100).toFixed(1)}%, sotto soglia ${low.length}, numeri discordanti ${numberIssues.length}`);
  for(const r of summary[edition].low)console.log('  SOTTO',JSON.stringify(r));
  for(const r of numberIssues)console.log('  NUMERI',JSON.stringify(r));
 }
}
module.exports={summary,words,shingles,numbers,itemText,PRINTED_ELSEWHERE};
if(!report){
 for(const [edition,s] of Object.entries(summary)){
  assert.deepEqual(s.missing,[],edition+': items not found in the raw text');
  assert.ok(s.mean>=0.97,edition+': mean similarity '+s.mean);
  assert.deepEqual(s.low,[],edition+': items below threshold');
  assert.deepEqual(s.numberIssues,[],edition+': numbers differ');
 }
 console.log('magic items fidelity: ok');
}
