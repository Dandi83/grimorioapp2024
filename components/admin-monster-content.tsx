"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Bold, Eraser, Italic, Plus, Trash2 } from "lucide-react";
import { parseMonsterContent, sanitizeEditorHtml, serializeMonsterContent } from "@/lib/monster-editor-content";

const inputClass = "w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-base text-foreground outline-none focus:border-primary";

/** A small visual editor: pasted content is plain text, formatting is explicit. */
function VisualText({ id, label, initialHtml, onChange }: {
  id: string; label: string; initialHtml: string; onChange: (html: string) => void;
}) {
  const area = useRef<HTMLDivElement>(null);
  const initial = useRef(initialHtml);
  useEffect(() => { if (area.current) area.current.innerHTML = sanitizeEditorHtml(initial.current); }, []);
  const emit = () => onChange(sanitizeEditorHtml(area.current?.innerHTML ?? ""));

  function selectionRange() {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !area.current?.contains(selection.getRangeAt(0).commonAncestorContainer)) return;
    return {selection, range:selection.getRangeAt(0)};
  }

  function format(tag: "strong" | "em" | "plain") {
    if (tag === "plain") {
      if (area.current) area.current.innerHTML=sanitizeEditorHtml(area.current.innerHTML).replace(/<\/?(?:strong|em)>/g, "");
      emit();
      return;
    }
    const current = selectionRange();
    if (!current || current.range.collapsed) return;
    const element = document.createElement(tag);
    element.append(current.range.extractContents());
    current.range.insertNode(element);
    current.range.selectNodeContents(element);
    current.selection.removeAllRanges();
    current.selection.addRange(current.range);
    emit();
  }

  return <div>
    <label id={`${id}-label`} htmlFor={id} className="mb-1.5 block text-sm text-muted-foreground">{label}</label>
    <div className="overflow-hidden rounded-lg border border-border bg-background focus-within:border-primary">
      <div role="toolbar" aria-label={`Formattazione ${label.toLowerCase()}`} className="flex flex-wrap items-center gap-1 border-b border-border p-1">
        {([{tag:"strong",label:"Grassetto",Icon:Bold},{tag:"em",label:"Corsivo",Icon:Italic},{tag:"plain",label:"Testo normale",Icon:Eraser}] as const).map(({tag,label:buttonLabel,Icon})=><button
          key={tag} type="button" title={tag === "plain" ? "Rimuovi grassetto e corsivo da tutta questa descrizione" : `${buttonLabel}: seleziona prima il testo`}
          onPointerDown={event=>event.preventDefault()} onClick={()=>format(tag)}
          className="flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground hover:bg-elevated hover:text-foreground"
        ><Icon className="h-4 w-4" aria-hidden />{buttonLabel}</button>)}
      </div>
      <div ref={area} id={id} role="textbox" aria-labelledby={`${id}-label`} aria-multiline="true" contentEditable suppressContentEditableWarning
        className="min-h-28 whitespace-pre-wrap break-words px-3 py-3 text-base leading-7 text-foreground outline-none [&_strong]:font-semibold [&_em]:italic"
        onInput={emit}
        onPaste={event=>{
          event.preventDefault();
          const current = selectionRange();
          if (!current) return;
          const fragment = document.createDocumentFragment();
          event.clipboardData.getData("text/plain").split(/\r?\n/).forEach((line,index)=>{
            if (index) fragment.append(document.createElement("br"));
            fragment.append(document.createTextNode(line));
          });
          const last = fragment.lastChild;
          current.range.deleteContents();
          current.range.insertNode(fragment);
          if (last) { current.range.setStartAfter(last); current.range.collapse(true); current.selection.removeAllRanges(); current.selection.addRange(current.range); }
          emit();
        }}
      />
    </div>
  </div>;
}

export function MonsterContentEditor({name,label,singular,initialHtml="",descriptionOnly=false}: {
  name:string; label:string; singular:string; initialHtml?:string; descriptionOnly?:boolean;
}) {
  const [state,setState] = useState(()=>parseMonsterContent(initialHtml));
  const [description,setDescription] = useState(initialHtml);
  const [descriptionEdited,setDescriptionEdited] = useState(false);
  const content = descriptionOnly ? (descriptionEdited ? sanitizeEditorHtml(description) : initialHtml) : serializeMonsterContent(state);
  function update(id:string,field:"title"|"body",value:string) {
    setState(previous=>({...previous,blocks:previous.blocks.map(block=>block.id === id ? {...block,[field]:value} : block)}));
  }
  function move(index:number,offset:number) {
    setState(previous=>{const blocks = [...previous.blocks]; [blocks[index],blocks[index+offset]] = [blocks[index+offset],blocks[index]]; return {...previous,blocks};});
  }
  return <details open={descriptionOnly || state.blocks.length > 0} className="rounded-xl border border-border bg-card p-4">
    <summary className="min-h-11 cursor-pointer font-serif text-xl text-primary">{label}{!descriptionOnly && <span className="ml-2 text-xs text-muted-foreground">{state.blocks.length}</span>}</summary>
    <input type="hidden" name={name} value={content} />
    <div className="mt-3 space-y-4">
      {descriptionOnly ? <VisualText id={`${name}-text`} label="Aspetto, comportamento e informazioni" initialHtml={initialHtml} onChange={html=>{setDescription(html);setDescriptionEdited(true);}} /> : <>
        <p className="text-xs leading-5 text-muted-foreground">Scrivi il nome e la descrizione: titolo, paragrafi e spaziatura vengono impaginati automaticamente. Puoi selezionare il testo per applicare grassetto o corsivo.</p>
        {state.blocks.map((block,index)=><div key={block.id} className="min-w-0 space-y-3 rounded-xl border border-primary/20 bg-background/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{singular} {index+1}</p>
            <div className="flex shrink-0 gap-1">
              <button type="button" disabled={index===0} aria-label={`Sposta su ${singular.toLowerCase()} ${index+1}`} onClick={()=>move(index,-1)} className="min-h-11 min-w-11 rounded-lg text-muted-foreground hover:bg-elevated disabled:opacity-25"><ArrowUp className="mx-auto h-4 w-4" aria-hidden /></button>
              <button type="button" disabled={index===state.blocks.length-1} aria-label={`Sposta giù ${singular.toLowerCase()} ${index+1}`} onClick={()=>move(index,1)} className="min-h-11 min-w-11 rounded-lg text-muted-foreground hover:bg-elevated disabled:opacity-25"><ArrowDown className="mx-auto h-4 w-4" aria-hidden /></button>
              <button type="button" aria-label={`Rimuovi ${singular.toLowerCase()} ${index+1}`} onClick={()=>setState(previous=>({...previous,blocks:previous.blocks.filter(item=>item.id!==block.id)}))} className="min-h-11 min-w-11 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="mx-auto h-4 w-4" aria-hidden /></button>
            </div>
          </div>
          <div><label htmlFor={`${name}-${block.id}-title`} className="mb-1.5 block text-sm text-muted-foreground">Nome {singular.toLowerCase()} <span className="text-xs">(facoltativo per introduzioni)</span></label>
            <input id={`${name}-${block.id}-title`} value={block.title} onChange={event=>update(block.id,"title",event.target.value)} placeholder={name==="azioni" ? "Es. Morso (ricarica 5–6)" : "Es. Resistenza leggendaria (3/giorno)"} className={inputClass} />
          </div>
          <VisualText id={`${name}-${block.id}-body`} label="Descrizione" initialHtml={block.body} onChange={html=>update(block.id,"body",html)} />
        </div>)}
        <button type="button" onClick={()=>setState(previous=>({...previous,blocks:[...previous.blocks,{id:crypto.randomUUID(),title:"",body:""}]}))} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 px-3 py-2.5 text-sm text-primary hover:bg-primary/5"><Plus className="h-4 w-4" aria-hidden />Aggiungi {singular.toLowerCase()}</button>
      </>}
    </div>
  </details>;
}
