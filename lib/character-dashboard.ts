import {applyDamage,bounded,normalizeCharacter,type Character} from './characters';
import {getPaperValue,setPaperValue} from './paper-sheet';
export function setDashboardPortrait(c:Character,portrait:string):Character {
 return {...c,paperFields:{...c.paperFields,'dashboard-portrait':portrait}};
}

export function changeDashboardHp(c:Character,delta:number):Character {
 const live={...c,hp:Number(getPaperValue(c,'Ferite')),hpMax:Number(getPaperValue(c,'PUNTI FERITA TOTALI')),tempHp:Number(getPaperValue(c,'PF temp'))};
 const patch=delta<0?applyDamage(live,-delta):{hp:bounded(live.hp+delta,0,live.hpMax),tempHp:live.tempHp};
 return setPaperValue(setPaperValue(c,'Ferite',String(patch.hp)),'PF temp',String(patch.tempHp));
}
export function changeAmmo(c:Character,fields:string[],delta:number):Character {
 const spent=fields.filter(k=>getPaperValue(c,k)===true||getPaperValue(c,k)==='Yes').length;
 const next=bounded(spent-delta,0,fields.length);
 return {...c,paperFields:{...c.paperFields,...Object.fromEntries(fields.map((k,i)=>[k,i<next]))}};
}
export function changeResource(c:Character,id:string,delta:number):Character {
 return normalizeCharacter({...c,resources:c.resources.map(r=>r.id===id?{...r,current:bounded(r.current+delta,0,r.max)}:r)});
}
