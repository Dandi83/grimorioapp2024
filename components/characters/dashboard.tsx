"use client";
import {useEffect,useRef,useState} from 'react';
import {Shield,Swords,Sparkles,UserRound,Heart,Backpack,ScrollText,BookOpen,Plus,Minus,Camera} from 'lucide-react';
import type {Character} from '@/lib/characters';
import {digitalGroup,digitalGroups,abilityNames} from '@/lib/digital-sheet';
import {getPaperValue} from '@/lib/paper-sheet';
import {changeDashboardHp,changeAmmo,changeResource} from '@/lib/character-dashboard';

export function CharacterDashboard({c,onChange,onPortrait}:{c:Character;onChange?:(next:Character)=>void;onPortrait?:(portrait:string)=>void}) {
 const [tab,setTab]=useState('Equipaggiamento');const [amount,setAmount]=useState(1);const [error,setError]=useState('');
 const portraitReader=useRef<FileReader|null>(null);
 useEffect(()=>()=>{portraitReader.current?.abort();portraitReader.current=null},[c.id]);
 function uploadPortrait(file:File|undefined){
  if(!file)return;
  if(file.size>3*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){setError('Scegli un’immagine PNG, JPEG o WebP fino a 3 MB.');return}
  portraitReader.current?.abort();
  const reader=new FileReader();portraitReader.current=reader;
  reader.onload=()=>{if(portraitReader.current!==reader)return;onPortrait?.(String(reader.result));portraitReader.current=null;setError('')};
  reader.onerror=()=>{if(portraitReader.current===reader){portraitReader.current=null;setError('Impossibile leggere questa immagine. Riprova con un altro file.')}};
  reader.readAsDataURL(file);
 }
 const value=(name:string)=>String(getPaperValue(c,name));
 const checked=(name:string)=>getPaperValue(c,name)===true||getPaperValue(c,name)==='Yes';
 const populated=(prefix:string)=>digitalGroups.filter(g=>g.id.startsWith(prefix)&&g.fields.some(f=>f.type==='text'?value(f.name).trim():checked(f.name)));
 const portrait=String(c.paperFields?.['dashboard-portrait']||'');
 const safePortrait=/^data:image\/(png|jpeg|webp);base64,/.test(portrait)?portrait:'';
 const health=Number(value('Ferite')),max=Number(value('PUNTI FERITA TOTALI'));
 function stepper(label:string,current:number,max:number,change:(delta:number)=>void){return <div className="pg-stepper"><button aria-label={`Consuma ${label}`} disabled={!onChange||current<=0} onClick={()=>change(-1)}><Minus size={15}/></button><span aria-live="polite">{current}<small> / {max}</small></span><button aria-label={`Recupera ${label}`} disabled={!onChange||current>=max} onClick={()=>change(1)}><Plus size={15}/></button></div>}
 return <section className="pg-dashboard" aria-label="Plancia personaggio">
 <div className="pg-hero">
 <div className="pg-portrait">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={safePortrait||'/hero-bestiario.png'} alt={safePortrait?`Ritratto di ${c.name}`:''} className={safePortrait?'pg-image':'pg-image pg-placeholder'}/>
 {!safePortrait&&<div className="pg-sigil"><UserRound size={90} strokeWidth={.7}/><span>Il tuo eroe</span></div>}
 <span className="pg-level"><small>LIVELLO</small>{c.level}</span>
 <label className="pg-upload"><Camera size={15}/><span>{safePortrait?'Cambia ritratto':'Carica ritratto'}</span><input aria-label="Carica ritratto personaggio" type="file" accept="image/png,image/jpeg,image/webp" disabled={!onPortrait} onChange={e=>{uploadPortrait(e.target.files?.[0]);e.target.value=''}}/></label>
 </div>
 <div className="pg-identity"><p className="pg-eyebrow">Grimorio · Il tuo personaggio</p><h1>{value('Nome')}</h1><p className="pg-class">{value('Classe e livello')}{c.subclass&&` · ${c.subclass}`}</p><p className="pg-origin">{[value('Razza'),value('Background'),value('Allineamento')].filter(Boolean).join(' · ')}</p>
 <div className="pg-combat">{[[Shield,'Classe armatura',value('Classe armatura')],[Swords,'Iniziativa',value('Iniziativa')],[Sparkles,'Competenza',value('Bonus competenza')]].map(([Icon,label,v])=>{const I=Icon as typeof Shield;return <div key={String(label)}><I size={19}/><strong>{String(v)}</strong><span>{String(label)}</span></div>})}</div>
 <div className="pg-health"><div><span><Heart size={15}/> Punti ferita</span><strong aria-live="polite">{health}<small> / {max}</small></strong></div><div className="pg-health-track" role="progressbar" aria-label="Punti ferita" aria-valuenow={health} aria-valuemin={0} aria-valuemax={max}><span style={{width:`${Math.min(100,Math.max(0,health/max*100))}%`}}/></div><p>+{value('PF temp')} PF temporanei <span>Velocità {value('Movimento base')} m</span></p><div className="pg-health-actions"><label><span>Quantità</span><input aria-label="Quantità danni o cura" type="number" min={1} max={9999} value={amount} onChange={e=>setAmount(Math.max(1,Math.min(9999,Math.trunc(Number(e.target.value)||1))))}/></label><button disabled={!onChange} onClick={()=>onChange?.(changeDashboardHp(c,-amount))}>− Danni</button><button disabled={!onChange} onClick={()=>onChange?.(changeDashboardHp(c,amount))}>+ Cura</button></div></div>
 {c.conditions.length>0&&<div className="pg-conditions">{c.conditions.map(s=><span key={s}>{s}</span>)}</div>}
 </div></div>
 {error&&<p role="alert" className="p-4 text-sm text-red-200">{error}</p>}
 <div className="pg-body"><section className="pg-attributes"><div className="pg-section-title"><span>01</span><h2>Caratteristiche</h2><small>Tocca per i dettagli</small></div><div className="pg-ability-grid">{abilityNames.map((a,i)=>{const g=digitalGroup(`ability-${a}`);return <details className="pg-ability" key={a}><summary><span>{['FOR','DES','COS','INT','SAG','CAR'][i]}</span><strong>{value(g.fields[1].name)}</strong><small>{a} <b>{value(g.fields[0].name)}</b></small></summary><div className="pg-ability-detail"><h3>{a}</h3>{g.fields.slice(2).filter(f=>f.type==='text').map(f=><p key={f.name}><span>Tiro salvezza</span><b>{value(f.name)}</b></p>)}{digitalGroups.filter(s=>s.id.startsWith(`skill-${a} `)).map(s=>{const f=s.fields.find(f=>f.type==='text')!;const checks=s.fields.filter(f=>f.type==='checkbox');return <p key={s.id}><span>{s.title}<small>{checked(checks[1].name)?'Maestria':checked(checks[0].name)?'Competenza':''}</small></span><b>{value(f.name)}</b></p>})}</div></details>})}</div></section>
 <nav className="pg-tabs" aria-label="Sezioni della plancia">{[[Backpack,'Equipaggiamento'],[BookOpen,'Incantesimi'],[Sparkles,'Capacità'],[ScrollText,'Note']].map(([Icon,name])=>{const I=Icon as typeof Backpack;return <button key={String(name)} aria-pressed={tab===name} aria-controls="pg-panel" onClick={()=>setTab(String(name))}><I size={17}/>{String(name)}</button>})}</nav>
 <div id="pg-panel" className="pg-panel" aria-label={tab}>
 {tab==='Equipaggiamento'&&<><div className="pg-section-title"><span>02</span><h2>Armi e attacchi</h2></div><div className="pg-attack-grid">{populated('attack-').map(g=><details className="pg-weapon" key={g.id}><summary><span className="pg-item-icon"><Swords size={26} strokeWidth={1.2}/></span><span className="pg-weapon-name"><strong>{value(g.fields[0].name)||g.title}</strong><small>{value(g.fields[2].name)||'Danni da definire'}</small></span><span className="pg-attack-bonus"><small>COLPIRE</small><b>{value(g.fields[1].name)||'—'}</b></span></summary><div className="pg-weapon-details">{g.fields.slice(3).map(f=>value(f.name)&&<p key={f.name}><strong>{f.label}</strong> {value(f.name)}</p>)}</div></details>)}</div>{!populated('attack-').length&&<p className="pg-empty">Nessuna arma inserita. Aggiungila da “Modifica scheda”.</p>}
 {populated('ammo-').map(g=>{const fields=g.fields.filter(f=>f.type==='checkbox').map(f=>f.name);const remaining=fields.length-fields.filter(checked).length;return <div className="pg-ammo" key={g.id}><div><strong>{value(g.fields[0].name)||g.title}</strong><small>Munizioni disponibili · contatore da 20 del PDF</small></div>{stepper(value(g.fields[0].name)||g.title,remaining,fields.length,d=>onChange?.(changeAmmo(c,fields,d)))}</div>})}
 <div className="pg-section-title pg-inventory-title"><span>03</span><h2>Equipaggiamento</h2></div><div className="pg-gear-grid">{digitalGroup('armor').fields.map((f,i)=><div className="pg-gear" key={f.name}><Shield size={22} strokeWidth={1}/><span>{f.label}</span><strong>{value(f.name)||'Non indicato'}</strong></div>)}</div><div className="pg-pack">{c.inventory.map(item=><div key={item.id}><span className="pg-item-icon"><Backpack size={18}/></span><div><strong>{item.name||'Oggetto'}</strong><small>{item.equipped?'Equipaggiato':'Nello zaino'}{item.weight?` · ${item.weight}`:''}</small></div><b>×{item.quantity}</b></div>)}</div><p className="pg-coins">{Object.entries(c.coins).map(([k,v])=><span key={k}>{v} <small>{k.toUpperCase()}</small></span>)}</p></>}
 {tab==='Incantesimi'&&<><div className="pg-section-title"><h2>Il tuo grimorio</h2></div><p className="pg-spell-stats">CD <strong>{value('CDspell')}</strong> · Attacco <strong>{value('Knwspell')}</strong></p>{c.slots.map((s,i)=>s.max>0&&<div key={i} className="pg-ammo"><strong>Slot di {i+1}° livello</strong>{stepper(`slot livello ${i+1}`,s.current,s.max,d=>onChange?.({...c,slots:c.slots.map((x,j)=>i===j?{...x,current:Math.max(0,Math.min(x.max,x.current+d))}:x)}))}</div>)}{c.spells.map(s=><a className="pg-spell" key={s.id} href={`/spell/${encodeURIComponent(s.id)}`} target="_blank" rel="noopener noreferrer"><BookOpen size={17}/><strong>{s.name}</strong><small>{s.prepared?'Preparato':'Conosciuto'} ↗</small></a>)}{!c.spells.length&&<p className="pg-empty">Aggiungi gli incantesimi dalla compilazione della scheda.</p>}</>}
 {tab==='Capacità'&&<><div className="pg-section-title"><h2>Talenti e risorse</h2></div>{c.resources.map(r=><div className="pg-ammo" key={r.id}><div><strong>{r.name}</strong><small>{r.recovery}</small></div>{stepper(r.name,r.current,r.max,d=>onChange?.(changeResource(c,r.id,d)))}</div>)}{populated('feature-').map(g=><div className="pg-feature" key={g.id}>{value(g.fields[0].name)}</div>)}<p className="pg-feature">{c.features||(!c.resources.length?'Nessuna capacità inserita.':'')}</p></>}
 {tab==='Note'&&<><div className="pg-section-title"><h2>Diario dell’avventura</h2></div><p className="pg-feature">{c.description}</p><label className="pg-notes-label">Appunti personali<textarea aria-label="Appunti personali" value={c.notes} disabled={!onChange} onChange={e=>onChange?.({...c,notes:e.target.value})} rows={7}/></label></>}
 </div><p className="pg-session-note">Modifiche rapide sincronizzate con la compilazione, solo in questa sessione. Esporta una copia prima di chiudere.</p></div>
 </section>;
}
