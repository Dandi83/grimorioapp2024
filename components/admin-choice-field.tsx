"use client";

import { useState } from "react";

const inputClass="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-base text-foreground outline-none focus:border-primary";

export function AdminChoiceField({name,label,initialValue,choices,placeholder}: {
  name:string;label:string;initialValue:string;choices:readonly string[];placeholder?:string;
}) {
  const [value,setValue]=useState(initialValue);
  const [selection,setSelection]=useState(()=>initialValue && !choices.includes(initialValue) ? "__custom__" : initialValue);
  return <div className="space-y-2">
    <input type="hidden" name={name} value={value} />
    <select id={name} value={selection} onChange={event=>{const next=event.target.value;setSelection(next);if(next!=="__custom__")setValue(next);}} className={inputClass}>
      <option value="">Seleziona…</option>
      {choices.map(choice=><option key={choice} value={choice}>{choice}</option>)}
      <option value="__custom__">Valore personalizzato…</option>
    </select>
    {selection==="__custom__" && <div><label htmlFor={`${name}-custom`} className="mb-1 block text-xs text-muted-foreground">Valore personalizzato <span className="sr-only">per {label.toLocaleLowerCase("it")}</span></label><input id={`${name}-custom`} value={value} onChange={event=>setValue(event.target.value)} placeholder={placeholder || "Scrivi il valore completo"} className={inputClass} /></div>}
  </div>;
}
