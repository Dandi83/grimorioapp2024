const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const ts=require('typescript');

// «Nomi da rivedere» (lib/review-names.ts): the names of lib/data/nomi-da-rivedere.json found in the texts of a card.
function load(relative){
 const filename=path.resolve(relative),mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText;
 new Function('require','module','exports',code)(id=>id.startsWith('./')?(id.endsWith('.json')?require(path.resolve(path.dirname(filename),id)):load(path.resolve(path.dirname(filename),id)+'.ts')):createRequire(filename)(id),mod,mod.exports);
 return mod.exports;
}
const names=load('lib/review-names.ts');

// The file: the 33 names of the request, each once.
const listed=names.REVIEW_NAMES.map(item=>item.nome);
assert.deepEqual(listed,['Hadar','Tasha','Agathys','Yolande','Bigby','Melf','Mordenkainen','Otiluke','Otto','Leomund','Nystul','Rary','Tenser','Evard','Drawmij','Snilloc','Maximilian','Aganazzar','Abi-Dalzim','Zephyra','Beholder','Mind Flayer','Illithid','Githyanki','Githzerai','Vecna','Strahd','Drizzt','Elminster','Bahamut','Tiamat','Asmodeus','Lolth']);

const found=(...texts)=>names.reviewNamesIn(texts);
assert.deepEqual(found('Fame di Hadar'),['Hadar']);
assert.deepEqual(found('Armatura di Agathys','tentacoli neri di evard'),['Agathys','Evard'],'any case, any field');
assert.deepEqual(found('Il risolutore di TASHA'),['Tasha']);
assert.deepEqual(found("La risata di Tasha's"),['Tasha'],'an apostrophe ends the word');
assert.deepEqual(found('Un mind flayer e un mind-flayer'),['Mind Flayer'],'space or dash inside a name');
assert.deepEqual(found('Abi Dalzim'),['Abi-Dalzim']);
assert.deepEqual(found('Melfi, Tenserini, Rarytà, Hadarico'),[],'whole words only');
assert.deepEqual(found('Dura otto ore.','Otto ore dopo'),['Otto'],'Otto only with a capital: «otto» is a number');
assert.deepEqual(found('Danza irresistibile di Otto'),['Otto']);
assert.deepEqual(found('Il drago di Bahamut e Tiamat, il beholder.'),['Beholder','Bahamut','Tiamat'],'in the order of the file');
assert.deepEqual(found('Palla di fuoco','Una sfera di fiamme esplode.'),[]);

// The texts of a card: every string of its fields, nested ones too; the id and the source label left out.
const card={id:'fame-di-hadar',fonte_scheda:'Aggiunta da te',nome_italiano:'Fame oscura',descrizione:'Il vuoto.',tratti:[{nome:'Occhio',descrizione:'Come un beholder.'}],livello:3};
assert.deepEqual(names.cardTexts(card),['Fame oscura','Il vuoto.','Occhio','Come un beholder.']);
assert.deepEqual(names.reviewNamesIn(names.cardTexts(card)),['Beholder'],'the id «fame-di-hadar» does not count');
console.log('Nomi da rivedere: 33 names, whole words, any case (Otto with a capital), spaces or dashes, nested card fields, id left out.');
