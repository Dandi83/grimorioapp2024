const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const root=process.cwd(),cache=new Map();
function load(file){if(cache.has(file))return cache.get(file);if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file));const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;new Function('require','module','exports',code)(id=>{if(id.startsWith('@/')||id.startsWith('.')){let f=id.startsWith('@/')?path.join(root,id.slice(2)):path.resolve(path.dirname(file),id);if(!path.extname(f))f=['.tsx','.ts','.json'].map(ext=>f+ext).find(fs.existsSync);return load(f)}return require(id)},m,m.exports);cache.set(file,m.exports);return m.exports}
assert.ok(fs.existsSync('components/characters/generated.tsx'),'Generate must produce a separate final sheet in monster style');
const {generateCharacterSheet}=load(path.resolve('lib/generated-character.ts'));
const {exampleCharacter}=load(path.resolve('lib/characters.ts'));
const {GeneratedCharacterSheet}=load(path.resolve('components/characters/generated.tsx'));
let c=exampleCharacter();const generated=generateCharacterSheet(c);c.name='Modificato dopo la generazione';c.scores.Forza=20;assert.equal(generated.name,'Lyria Ventodargento');assert.equal(generated.scores.Forza,8,'A generated sheet must be an independent snapshot');
let html=renderToStaticMarkup(React.createElement(GeneratedCharacterSheet,{c:generated}));assert.ok(html.includes('Lyria Ventodargento')&&html.includes('Bastone')&&html.includes('Recupero Arcano'));assert.ok(!/<(?:input|textarea|select)\b/.test(html),'The final sheet must show the generated result, not editable forms');assert.ok(html.includes('hero-bestiario.png'),'Use the same hero treatment as monster sheets');
const source=require('../lib/data/character-paper-fields.json').fields.filter(f=>f.page===1);
const filled={...generated,paperFields:Object.fromEntries(source.map((f,i)=>[f.name,f.type==='checkbox'?true:`Parametro-${i}-completo`]))};
html=renderToStaticMarkup(React.createElement(GeneratedCharacterSheet,{c:filled}));for(const [i,f] of source.entries())if(f.type!=='checkbox')assert.ok(html.includes(`Parametro-${i}-completo`),`Missing populated parameter in the final sheet: ${f.name}`);
const escaped=renderToStaticMarkup(React.createElement(GeneratedCharacterSheet,{c:{...generated,name:'<script>alert(1)</script>'}}));assert.ok(!escaped.includes('<script>'),'User values must be escaped');
console.log('Generated sheet: independent snapshot, full populated first-page text coverage, monster-style layout, no form controls, escaped user content passed');
