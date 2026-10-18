"use client";

import { useState } from "react";
import { parseLivello, SCHOOL_KEYWORDS } from "@/lib/spells-types";

const inputClass="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-base text-foreground outline-none focus:border-primary";
const CLASSES=["artefice","bardo","chierico","druido","mago","paladino","ranger","stregone","warlock"];

export function SpellClassification({initialValue}: {initialValue:string}) {
  const parsed=parseLivello(initialValue);
  const [mode,setMode]=useState(initialValue && (parsed.livello_num<0 || parsed.livello_num>9 || !parsed.scuola) ? "custom" : "guided");
  const [level,setLevel]=useState(parsed.livello_num>=0 && parsed.livello_num<=9 ? String(parsed.livello_num) : "");
  const [school,setSchool]=useState(parsed.scuola);
  const [classes,setClasses]=useState(parsed.classi.join(", "));
  const [raw,setRaw]=useState(initialValue);
  const [edited,setEdited]=useState(false);
  const composed=level!=="" && school ? `${level==="0" ? `Trucchetto di ${school.toLocaleLowerCase("it")}` : `${school} di ${level}° livello`}${classes.trim() ? ` (${classes.trim()})` : ""}` : "";
  const value=!edited ? initialValue : mode==="custom" ? raw : composed;
  return <section className="space-y-4 rounded-xl border border-border p-4">
    <h3 className="font-serif text-xl text-primary">Livello, scuola e classi</h3>
    <input type="hidden" name="livello" value={value} />
    <div><label htmlFor="spell-classification-mode" className="mb-1.5 block text-sm text-muted-foreground">Compilazione</label><select id="spell-classification-mode" value={mode} onChange={event=>{
      const next=event.target.value;
      if(next==="custom")setRaw(value);
      else {const parsedRaw=parseLivello(raw);setLevel(parsedRaw.livello_num>=0 && parsedRaw.livello_num<=9 ? String(parsedRaw.livello_num) : "");setSchool(parsedRaw.scuola);setClasses(parsedRaw.classi.join(", "));}
      setMode(next);setEdited(true);
    }} className={inputClass}><option value="guided">Con le tendine</option><option value="custom">Testo personalizzato</option></select></div>
    {mode==="custom" ? <div><label htmlFor="spell-classification-custom" className="mb-1.5 block text-sm text-muted-foreground">Testo completo</label><input id="spell-classification-custom" value={raw} onChange={event=>{setRaw(event.target.value);setEdited(true);}} className={inputClass} /></div> : <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="spell-level" className="mb-1.5 block text-sm text-muted-foreground">Livello *</label><select id="spell-level" required value={level} onChange={event=>{setLevel(event.target.value);setEdited(true);}} className={inputClass}><option value="">Seleziona…</option>{Array.from({length:10},(_,n)=><option key={n} value={n}>{n===0 ? "Trucchetto" : `${n}° livello`}</option>)}</select></div>
        <div><label htmlFor="spell-school" className="mb-1.5 block text-sm text-muted-foreground">Scuola *</label><select id="spell-school" required value={school} onChange={event=>{setSchool(event.target.value);setEdited(true);}} className={inputClass}><option value="">Seleziona…</option>{SCHOOL_KEYWORDS.map(item=><option key={item} value={item}>{item}</option>)}</select></div>
      </div>
      <div><label htmlFor="spell-class-add" className="mb-1.5 block text-sm text-muted-foreground">Classi</label><select id="spell-class-add" value="" onChange={event=>{const next=event.target.value;if(next){setClasses(previous=>previous.split(",").some(item=>item.trim().toLocaleLowerCase("it")===next) ? previous : [previous.trim(),next].filter(Boolean).join(", "));setEdited(true);}}} className={inputClass}><option value="">Aggiungi una classe…</option>{CLASSES.map(item=><option key={item} value={item}>{item[0].toUpperCase()+item.slice(1)}</option>)}</select></div>
      <div><label htmlFor="spell-classes" className="mb-1.5 block text-xs text-muted-foreground">Elenco classi, modificabile</label><input id="spell-classes" value={classes} onChange={event=>{setClasses(event.target.value);setEdited(true);}} placeholder="Es. mago, stregone" className={inputClass} /></div>
    </>}
    {value && <p className="break-words rounded-lg bg-background p-3 text-xs leading-5 text-muted-foreground">{value}</p>}
  </section>;
}

export function SpellComponents({initialValue}: {initialValue:string}) {
  const parsed=initialValue.match(/^\s*((?:[VSM](?:\s*,\s*[VSM])*))(?:\s*\(([\s\S]*)\))?\s*$/);
  const [mode,setMode]=useState(initialValue && !parsed ? "custom" : "guided");
  const [selected,setSelected]=useState(()=>parsed ? parsed[1].split(",").map(item=>item.trim()) : [] as string[]);
  const [material,setMaterial]=useState(parsed?.[2] || "");
  const [raw,setRaw]=useState(initialValue);
  const [edited,setEdited]=useState(false);
  const composed=["V","S","M"].filter(item=>selected.includes(item)).join(", ")+(selected.includes("M") && material.trim() ? ` (${material.trim()})` : "");
  const value=!edited ? initialValue : mode==="custom" ? raw : composed;
  return <section className="space-y-4 rounded-xl border border-border p-4"><h3 className="font-serif text-xl text-primary">Componenti</h3>
    <input type="hidden" name="componenti" value={value} />
    <div><label htmlFor="spell-components-mode" className="mb-1.5 block text-sm text-muted-foreground">Compilazione</label><select id="spell-components-mode" value={mode} onChange={event=>{
      const next=event.target.value;
      if(next==="custom")setRaw(value);
      else {const parsedRaw=raw.match(/^\s*((?:[VSM](?:\s*,\s*[VSM])*))(?:\s*\(([\s\S]*)\))?\s*$/);setSelected(parsedRaw ? parsedRaw[1].split(",").map(item=>item.trim()) : []);setMaterial(parsedRaw?.[2]||"");}
      setMode(next);setEdited(true);
    }} className={inputClass}><option value="guided">V / S / M</option><option value="custom">Testo personalizzato</option></select></div>
    {mode==="custom" ? <div><label htmlFor="spell-components-custom" className="mb-1.5 block text-sm text-muted-foreground">Componenti complete</label><input id="spell-components-custom" value={raw} onChange={event=>{setRaw(event.target.value);setEdited(true);}} className={inputClass} /></div> : <>
      <div className="flex flex-wrap gap-3">{([['V','Verbali'],['S','Somatiche'],['M','Materiali']] as const).map(([key,label])=><label key={key} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><input id={`component-${key}`} type="checkbox" checked={selected.includes(key)} onChange={event=>{const checked=event.target.checked;setSelected(previous=>checked ? [...previous,key] : previous.filter(item=>item!==key));setEdited(true);}} className="h-4 w-4 accent-primary" />{key} · {label}</label>)}</div>
      {selected.includes("M") && <div><label htmlFor="spell-material" className="mb-1.5 block text-sm text-muted-foreground">Materiali, costo ed eventuale consumo</label><input id="spell-material" value={material} onChange={event=>{setMaterial(event.target.value);setEdited(true);}} placeholder="Es. un diamante del valore di 300 mo, che si consuma" className={inputClass} /></div>}
    </>}
  </section>;
}
