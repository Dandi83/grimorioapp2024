const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const cache=new Map();function load(file){if(cache.has(file))return cache.get(file);if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file));const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>id.startsWith('.')?load(path.resolve(path.dirname(file),id)+'.ts'):require(id),m,m.exports);cache.set(file,m.exports);return m.exports}
const {exampleCharacter}=load(path.resolve('lib/characters.ts'));
const {changeDashboardHp,changeAmmo,changeResource}=load(path.resolve('lib/character-dashboard.ts'));
const c=exampleCharacter();c.tempHp=3;
let n=changeDashboardHp(c,-5);assert.equal(n.hp,14);assert.equal(n.tempHp,0);assert.equal(c.hp,16,'Immutable changes');
assert.equal(changeDashboardHp(c,100).hp,20);assert.equal(changeDashboardHp(c,-100).hp,0);
const fields=JSON.parse(fs.readFileSync('lib/data/character-paper-fields.json')).fields.filter(f=>f.page===1&&f.name.startsWith('ammo#')).slice(0,20).map(f=>f.name);
n=changeAmmo(c,fields,-1);assert.equal(fields.filter(k=>n.paperFields[k]===true).length,1,'Consuming ammo marks one spent counter');
n=changeAmmo(n,fields,1);assert.equal(fields.filter(k=>n.paperFields[k]===true).length,0);
for(let i=0;i<30;i++)n=changeAmmo(n,fields,-1);assert.equal(fields.filter(k=>n.paperFields[k]===true).length,20);
n=changeResource(c,c.resources[0].id,-10);assert.equal(n.resources[0].current,0);assert.equal(changeResource(n,c.resources[0].id,10).resources[0].current,1);
console.log('Dashboard: damage, temporary HP, healing caps, immutable updates, ammo mapping and resource boundaries passed');
