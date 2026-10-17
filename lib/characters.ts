export const ABILITIES = ['Forza','Destrezza','Costituzione','Intelligenza','Saggezza','Carisma'] as const;
export type Ability = typeof ABILITIES[number];
export const SKILLS: [string, Ability][] = [['Acrobazia','Destrezza'],['Addestrare Animali','Saggezza'],['Arcano','Intelligenza'],['Atletica','Forza'],['Furtività','Destrezza'],['Indagare','Intelligenza'],['Inganno','Carisma'],['Intimidire','Carisma'],['Intrattenere','Carisma'],['Intuizione','Saggezza'],['Medicina','Saggezza'],['Natura','Intelligenza'],['Percezione','Saggezza'],['Persuasione','Carisma'],['Rapidità di Mano','Destrezza'],['Religione','Intelligenza'],['Sopravvivenza','Saggezza'],['Storia','Intelligenza']];
export type Resource = {id:string; name:string; current:number; max:number; recovery:string};
export type Attack = {id:string; name:string; bonus:string; damage:string; notes:string};
export type Item = {id:string; name:string; quantity:number; weight:string; equipped:boolean};
export type Character = {
 paperFields?:Record<string,string|boolean>;
 id:string; name:string; className:string; subclass:string; species:string; background:string; level:number; description:string;
 scores:Record<Ability,number>; saves:Partial<Record<Ability,boolean>>; skills:Record<string,{rank:number;bonus:number}>;
 ac:number; speed:number; initiativeBonus:number; initiativeOverride:string; hpMax:number; hp:number; tempHp:number; hitDice:string;
 deathSuccess:number; deathFailure:number; conditions:string[]; attacks:Attack[]; resources:Resource[]; features:string;
 casting:Ability; spellDcOverride:string; spellAttackOverride:string; spells:{id:string;name:string;prepared:boolean}[]; slots:{max:number;current:number}[];
 inventory:Item[]; coins:{mc:number;ma:number;me:number;mo:number;mp:number}; notes:string;
};
export function bounded(value:number, min:number, max:number) {return Number.isFinite(value)?Math.min(max,Math.max(min,Math.trunc(value))):min;}
export function modifier(score:number) {return Math.floor((score-10)/2);}
export function proficiency(level:number) {return 2+Math.floor((bounded(level,1,20)-1)/4);}
export function checkBonus(score:number,level:number,rank:number,bonus=0) {return modifier(score)+proficiency(level)*rank+bonus;}
export function signed(n:number) {return n>=0?`+${n}`:String(n);}
export function createCharacter(name:string):Character {return {
 id:crypto.randomUUID(), name:name.trim().slice(0,80)||'Nuovo personaggio',className:'',subclass:'',species:'',background:'',level:1,description:'',
 scores:Object.fromEntries(ABILITIES.map(a=>[a,10])) as Record<Ability,number>,saves:{},skills:{},ac:10,speed:9,initiativeBonus:0,initiativeOverride:'',hpMax:1,hp:1,tempHp:0,hitDice:'1d8',deathSuccess:0,deathFailure:0,conditions:[],attacks:[],resources:[],features:'',casting:'Intelligenza',spellDcOverride:'',spellAttackOverride:'',spells:[],slots:Array.from({length:9},()=>({max:0,current:0})),inventory:[],coins:{mc:0,ma:0,me:0,mo:0,mp:0},notes:''
};}
export function normalizeCharacter(c:Character):Character {
 const hpMax=bounded(c.hpMax,1,9999);
 return {...c,level:bounded(c.level,1,20),hpMax,hp:bounded(c.hp,0,hpMax),tempHp:bounded(c.tempHp,0,9999),ac:bounded(c.ac,0,99),speed:bounded(c.speed,0,999),deathSuccess:bounded(c.deathSuccess,0,3),deathFailure:bounded(c.deathFailure,0,3),scores:Object.fromEntries(ABILITIES.map(a=>[a,bounded(c.scores[a],1,30)])) as Record<Ability,number>,slots:c.slots.map(s=>{const max=bounded(s.max,0,99);return {max,current:bounded(s.current,0,max)}}),resources:c.resources.map(r=>{const max=bounded(r.max,0,999);return {...r,max,current:bounded(r.current,0,max)}}),inventory:c.inventory.map(i=>({...i,quantity:bounded(i.quantity,0,9999)}))};
}
export function applyDamage(c:Character,amount:number) {const damage=bounded(amount,0,99999);return {tempHp:Math.max(0,c.tempHp-damage),hp:Math.max(0,c.hp-Math.max(0,damage-c.tempHp))};}
export function exampleCharacter():Character {
 const c=createCharacter('Lyria Ventodargento');
 return {...c,className:'Mago',species:'Elfo',background:'Saggio',subclass:'Abiuratore',level:3,description:'Custode di una biblioteca dimenticata, in cerca dei frammenti di un antico sigillo.',scores:{Forza:8,Destrezza:14,Costituzione:14,Intelligenza:16,Saggezza:12,Carisma:10},saves:{Intelligenza:true,Saggezza:true},skills:{Arcano:{rank:1,bonus:0},Storia:{rank:1,bonus:0},Percezione:{rank:1,bonus:0}},hpMax:20,hp:16,ac:12,hitDice:'3d6',slots:[{max:4,current:3},{max:2,current:2},...c.slots.slice(2)],attacks:[{id:crypto.randomUUID(),name:'Bastone',bonus:'+1',damage:'1d6 − 1 contundenti',notes:'Versatile (1d8)'}],resources:[{id:crypto.randomUUID(),name:'Recupero Arcano',current:1,max:1,recovery:'Riposo lungo'}],inventory:[{id:crypto.randomUUID(),name:'Libro degli incantesimi',quantity:1,weight:'1,5 kg',equipped:true},{id:crypto.randomUUID(),name:'Bastone',quantity:1,weight:'2 kg',equipped:true}],coins:{mc:0,ma:8,me:0,mo:25,mp:0},notes:'Raggiungere la torre prima della prossima luna nuova.\n\nPersonaggio dimostrativo: i valori sono di esempio, non una creazione automatica convalidata.'};
}

export function commitNumber(value:string,min:number,max:number) {return bounded(Number(value),min,max);}
export function commitName(value:string) {return value.trim().slice(0,80)||'Personaggio senza nome';}
