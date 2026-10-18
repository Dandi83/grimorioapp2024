"use client";

import { useState } from "react";
import { conditions } from "@/lib/conditions";
import { SIZES, TYPE_KEYWORDS, type Monster } from "@/lib/monsters-types";

const inputClass="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-base text-foreground outline-none focus:border-primary";
const CUSTOM="__custom__";
const CHOICES: Partial<Record<keyof Monster,readonly string[]>> = {
  tipo:TYPE_KEYWORDS.map(type=>type==="Fata" ? "Folletto" : type==="Pianta" ? "Vegetale" : type),
  taglia:SIZES,
  allineamento:["legale buono","neutrale buono","caotico buono","legale neutrale","neutrale","caotico neutrale","legale malvagio","neutrale malvagio","caotico malvagio","senza allineamento","qualsiasi allineamento"],
  grado_sfida:["0","1/8","1/4","1/2",...Array.from({length:30},(_,index)=>String(index+1))],
  velocita:["0 m","3 m","6 m","9 m","12 m","15 m","18 m"],
};
const DAMAGE_TYPES=["acido","contundente","forza","freddo","fulmine","fuoco","necrotico","perforante","psichico","radiante","tagliente","tuono","veleno"];
const ADDITIONS: Partial<Record<keyof Monster,readonly string[]>> = {
  vulnerabilita:DAMAGE_TYPES,
  resistenze:DAMAGE_TYPES,
  immunita_danni:DAMAGE_TYPES,
  immunita_condizioni:conditions.map(condition=>condition.title.toLocaleLowerCase("it")),
  linguaggi:["Abissale","Celestiale","Comune","Draconico","Elfico","Gergo delle Profondità","Gigante","Gnomesco","Goblin","Halfling","Infernale","Nanico","Orchesco","Primordiale","Silvano","Sottocomune"],
};

/** Hidden canonical values keep the server form contract and original custom text intact. */
export function AdminMonsterField({name,label,initialValue,placeholder}: {
  name:keyof Monster;label:string;initialValue:string;placeholder?:string;
}) {
  const choices=CHOICES[name];
  const additions=ADDITIONS[name];
  const [value,setValue]=useState(initialValue);
  const [selection,setSelection]=useState(()=>choices && initialValue && !choices.includes(initialValue) ? CUSTOM : initialValue);

  if (choices) return <div className="space-y-2">
    <input type="hidden" name={name} value={value} />
    <select id={name} value={selection} onChange={event=>{
      const selected=event.target.value;
      setSelection(selected);
      if(selected!==CUSTOM)setValue(selected);
    }} className={inputClass}>
      <option value="">Seleziona…</option>
      {choices.map(choice=><option key={choice} value={choice}>{choice}</option>)}
      <option value={CUSTOM}>Valore personalizzato…</option>
    </select>
    {selection===CUSTOM && <div><label htmlFor={`${name}-custom`} className="mb-1 block text-xs text-muted-foreground">Valore personalizzato <span className="sr-only">per {label.toLocaleLowerCase("it")}</span></label><input id={`${name}-custom`} value={value} onChange={event=>setValue(event.target.value)} placeholder={placeholder || "Scrivi il valore completo"} className={inputClass} /></div>}
  </div>;

  if (additions) return <div className="space-y-2">
    <select id={`${name}-add`} aria-label={`Aggiungi a ${label.toLocaleLowerCase("it")}`} value="" onChange={event=>{
      const selected=event.target.value;
      if(!selected)return;
      setValue(previous=>{
        const tokens=previous.split(/[,;]/).map(token=>token.trim().toLocaleLowerCase("it"));
        if(tokens.includes(selected.toLocaleLowerCase("it")))return previous;
        return previous.trim() ? `${previous}${/[,;]\s*$/.test(previous) ? " " : ", "}${selected}` : selected;
      });
    }} className={inputClass}>
      <option value="">{name==="linguaggi" ? "Aggiungi un linguaggio…" : name==="immunita_condizioni" ? "Aggiungi una condizione…" : "Aggiungi un tipo di danno…"}</option>
      {additions.map(choice=><option key={choice} value={choice}>{choice}</option>)}
    </select>
    <input id={name} name={name} value={value} onChange={event=>setValue(event.target.value)} placeholder={placeholder} className={inputClass} />
    <p className="text-xs leading-5 text-muted-foreground">Puoi aggiungere più voci e modificare il testo completo qui sopra.</p>
  </div>;

  return <input id={name} name={name} required={name==="nome"} defaultValue={initialValue} placeholder={placeholder} className={inputClass} />;
}
