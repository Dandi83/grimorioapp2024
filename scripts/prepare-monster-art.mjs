// Build-time asset preparation. Never run during application requests.
// Uses the sharp version installed by the locked Next.js dependency tree.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');
const mode = process.argv[2];
if (!['--write','--ensure'].includes(mode) || (mode==='--write' && !process.argv[3])) {
  console.error('Usage: node scripts/prepare-monster-art.mjs --ensure [cache] OR --write /absolute/source-cache');
  process.exit(1);
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cache = path.resolve(process.argv[3] || path.join(root,'.next/cache/creature-art-sources'));
const target = path.join(root,'lib/data/prepared-art');
await mkdir(cache,{recursive:true});await mkdir(target,{recursive:true});
const registry = JSON.parse(await readFile(path.join(root,'lib/data/official-creature-art.json'),'utf8'));
let previous = {};
try {previous = JSON.parse(await readFile(path.join(root,'lib/data/prepared-art-manifest.json'),'utf8'));} catch(e) {if(e.code!=='ENOENT')throw e;}
const ids = Object.keys(registry).sort();
const report = {};
let cursor = 0, completed = 0;
const errors = [];
function markCompleted() {completed++;if(completed%20===0 || completed===ids.length)console.log(`Prepared and checked ${completed}/${ids.length}`);}
async function prepare(id) {
  const art = registry[id],url = new URL(art.src);
  if (url.origin !== 'https://www.dndbeyond.com' || !url.pathname.startsWith('/avatars/thumbnails/') || url.search) throw Error('Unexpected source: '+id);
  const expected = previous.images?.[id];
  const output = path.join(target,id+'.webp');
  if(mode==='--ensure') {
    if(previous.quality!==75 || previous.alphaQuality!==100 || previous.effort!==6 || !expected || expected.sourceUrl!==art.src || expected.width!==art.width || expected.height!==art.height)throw Error('Preparation manifest mismatch: '+id);
    try {
      const ready = await readFile(output);
      if(createHash('sha256').update(ready).digest('hex')===expected.sha256){report[id]=expected;markCompleted();return;}
    } catch(e){if(e.code!=='ENOENT')throw e;}
  }
  const cached = path.join(cache,id+'-'+createHash('sha256').update(art.src).digest('hex').slice(0,12)+'.source');
  let source;
  try {source = await readFile(cached);} catch (e) {
    if (e.code !== 'ENOENT') throw e;
    const response = await fetch(art.src,{signal:AbortSignal.timeout(45000)});
    if (!response.ok) throw Error('Source HTTP '+response.status+': '+id);
    source = Buffer.from(await response.arrayBuffer());await writeFile(cached,source);
  }
  const original = await sharp(source).metadata();
  if (original.width !== art.width || original.height !== art.height) throw Error('Registry dimension mismatch: '+id);
  const sourceSha = createHash('sha256').update(source).digest('hex');
  if(mode==='--ensure' && sourceSha!==expected.sourceSha256)throw Error('Source checksum changed: '+id);
  let reusable = false;
  try {
    const existing = await readFile(output),old = previous.images?.[id];
    reusable = previous.quality===75 && previous.alphaQuality===100 && previous.effort===6 && old?.sourceSha256===sourceSha && old.sha256===createHash('sha256').update(existing).digest('hex');
  } catch(e) {if(e.code!=='ENOENT')throw e;}
  if(!reusable)await sharp(source).webp({quality:75,alphaQuality:100,effort:6}).toFile(output);
  const result = await readFile(output);
  if(mode==='--ensure' && createHash('sha256').update(result).digest('hex')!==expected.sha256)throw Error('Prepared checksum mismatch: '+id);
  const meta = await sharp(result).metadata();
  if(meta.width!==original.width || meta.height!==original.height || meta.format!=='webp') throw Error('Output dimensions/format mismatch: '+id);
  const beforeAlpha = await sharp(source).ensureAlpha().extractChannel('alpha').raw().toBuffer();
  const afterAlpha = await sharp(result).ensureAlpha().extractChannel('alpha').raw().toBuffer();
  if(!beforeAlpha.equals(afterAlpha)) throw Error('Transparency mismatch: '+id);
  report[id] = {sourceUrl:art.src,sourceSha256:createHash('sha256').update(source).digest('hex'),sha256:createHash('sha256').update(result).digest('hex'),sourceBytes:source.length,bytes:result.length,width:meta.width,height:meta.height,alphaIdentical:true};
  markCompleted();
}
await Promise.all(Array.from({length:4},async()=>{
  while(cursor<ids.length){const id=ids[cursor++];try{await prepare(id);}catch(e){errors.push(String(e));console.error(String(e));}}
}));
if(errors.length){console.error(`${errors.length} preparation failures; selector not changed.`);process.exit(1);}
if(mode==='--ensure'){console.log(`All ${ids.length} locked artwork files ready for build.`);process.exit(0);}
const manifest = Object.fromEntries(ids.map(id=>[id,report[id]]));
await writeFile(path.join(root,'lib/data/prepared-art-manifest.json'),JSON.stringify({quality:75,alphaQuality:100,effort:6,images:manifest},null,2)+'\n');
const imports = ids.map((id,i)=>`import art${i} from "./data/prepared-art/${id}.webp";`).join('\n');
const mappings = ids.map((id,i)=>`  ${JSON.stringify(id)}: art${i},`).join('\n');
await writeFile(path.join(root,'lib/prepared-monster-art.ts'),`${imports}\nimport type { StaticImageData } from "next/image";\n\n// Approved prepared artwork, shared by preview and production.\nconst preparedArt: Record<string, StaticImageData> = {\n${mappings}\n};\n\nexport function getPreparedMonsterArt(id: string, environment = process.env.VERCEL_ENV) {\n  if (environment !== "preview" && environment !== "production") return undefined;\n  return Object.prototype.hasOwnProperty.call(preparedArt, id) ? preparedArt[id] : undefined;\n}\n`);
console.log(JSON.stringify({count:ids.length,sourceBytes:Object.values(manifest).reduce((a,x)=>a+x.sourceBytes,0),preparedBytes:Object.values(manifest).reduce((a,x)=>a+x.bytes,0)}));
