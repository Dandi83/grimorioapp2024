const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {createRequire} = require('node:module');
const {getImageProps} = require('next/image');
const sharp = require('sharp');
const {createHash} = require('node:crypto');
const file = path.resolve('lib/prepared-monster-art.ts');
const mod = {exports:{}};
const code = ts.transpileModule(fs.readFileSync(file,'utf8'), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}
}).outputText;
const staticImages = {};
new Function('require','module','exports',code)(id => {
  if (id.endsWith('.webp')) {
    const local = path.resolve(path.dirname(file),id);
    return staticImages[local] = {src:'/_next/static/media/'+path.basename(id),width:1,height:1,blurDataURL:'data:image/webp;base64,UklGRg=='};
  }
  return createRequire(file)(id);
},mod,mod.exports);
(async()=>{
  assert.equal(typeof mod.exports.getPreparedMonsterArt,'function','Prepared artwork must be available for the preview experiment');
  const registry = require('../lib/data/official-creature-art.json');
  const manifest = require('../lib/data/prepared-art-manifest.json');
  assert.equal(manifest.quality,75);assert.equal(manifest.alphaQuality,100);
  assert.deepEqual(Object.keys(manifest.images).sort(),Object.keys(registry).sort());
  for (const id of Object.keys(registry)) {
    const prepared = mod.exports.getPreparedMonsterArt(id,'preview');
    assert.ok(prepared, id+' must have a prepared image');
    const asset = Object.keys(staticImages).find(f=>f.endsWith('/'+id+'.webp'));
    const meta = await sharp(asset).metadata();
    assert.equal(manifest.images[id].sourceUrl,registry[id].src,'Prepared artwork must match its approved source');
    assert.equal(manifest.images[id].sha256,createHash('sha256').update(fs.readFileSync(asset)).digest('hex'),'Prepared asset must match the audited file');
    assert.equal(manifest.images[id].alphaIdentical,true);
    assert.equal(meta.width,registry[id].width,'Do not downscale the approved source');
    assert.equal(meta.height,registry[id].height,'Preserve the source proportions');
    Object.assign(prepared,{width:meta.width,height:meta.height});
    const {props} = getImageProps({src:prepared,alt:registry[id].name,unoptimized:true,placeholder:'blur'});
    assert.ok(props.src.startsWith('/_next/static/media/'),'No remote fetch or runtime optimizer for pilot images');
    assert.equal(props.srcSet,undefined);
    assert.equal(props.width,meta.width);assert.equal(props.height,meta.height);
    assert.ok(props.style.backgroundImage,'The image must show a placeholder while loading');
    assert.equal(mod.exports.getPreparedMonsterArt(id,'production'),undefined,'Pilot must not activate in production');
  }
  assert.equal(Object.keys(staticImages).length,Object.keys(registry).length,'Every approved artwork must be prepared');
  assert.equal(mod.exports.getPreparedMonsterArt('unknown','preview'),undefined);
  console.log('Prepared artwork: all approved images, preview isolation, static delivery, dimensions and loading placeholder verified.');
})().catch(e=>{console.error(e);process.exitCode=1;});
