"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { AnalyticsEvent, AnalyticsInput } from "@/lib/analytics-events";

type Status={enabled:boolean;excluded:boolean;consent:"accepted"|"rejected"|null};
const SESSION="grimorio_statistics_session";
export function AnalyticsProvider() {
  const path=usePathname();
  const [status,setStatus]=useState<Status|null>(null),[preferences,setPreferences]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState("");
  const enabled=useRef(false);
  useEffect(()=>{const controller=new AbortController();fetch("/api/analytics",{cache:"no-store",signal:controller.signal}).then(r=>r.json()).then(setStatus).catch(()=>{});return()=>controller.abort();},[]);
  useEffect(()=>{const open=()=>{setPreferences(true);setError("");};window.addEventListener("grimorio:analytics-preferences",open);return()=>window.removeEventListener("grimorio:analytics-preferences",open);},[]);
  const accepted=!!status?.enabled && !status.excluded && status.consent==="accepted";
  useEffect(()=>{enabled.current=accepted;return()=>{enabled.current=false;};},[accepted]);
  useEffect(()=>{
    if(!accepted||path.startsWith("/admin")||path.startsWith("/account")||path.startsWith("/personaggi"))return;
    let session:string,view=crypto.randomUUID(),isTest=false;
    try {
      const old=JSON.parse(sessionStorage.getItem(SESSION)||"null") as {id?:string;last?:number;test?:boolean}|null;
      const recent=old?.id && old.last && Date.now()-old.last<30*60*1000;
      session=recent ? old.id! : crypto.randomUUID();
      isTest=new URLSearchParams(window.location.search).get("analytics_test")==="1" || !!(recent&&old?.test);
      sessionStorage.setItem(SESSION,JSON.stringify({id:session,last:Date.now(),test:isTest}));
    } catch {session=crypto.randomUUID();isTest=new URLSearchParams(window.location.search).get("analytics_test")==="1";}
    const source=new URLSearchParams(window.location.search).get("ref")==="share" ? "share" as const : "direct" as const;
    const card=!!document.querySelector("article.spell-sheet,article.monster-sheet");
    let seconds=0,scroll=0,read=false,lastInteraction=Date.now(),lastTick=Date.now(),live=true;
    function send(event:AnalyticsEvent) {
      if(!enabled.current||!live)return;
      const body:AnalyticsInput={event,id:crypto.randomUUID(),view,session,path,test:isTest,source,activeSeconds:Math.floor(seconds),scrollPercent:Math.floor(scroll)};
      void fetch("/api/analytics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),keepalive:true}).catch(()=>{});
    }
    function measureScroll() {
      const article=document.querySelector("article.spell-sheet,article.monster-sheet");
      if(!article)return;
      const rect=article.getBoundingClientRect();
      scroll=Math.max(scroll,Math.min(100,Math.max(0,(window.innerHeight-rect.top)/rect.height*100)));
    }
    const interact=()=>{lastInteraction=Date.now();measureScroll();};
    const visibility=()=>{lastTick=Date.now();if(document.visibilityState==="visible")lastInteraction=Date.now();};
    const share=(event:Event)=>{const name=(event as CustomEvent).detail?.event as AnalyticsEvent;if(["share_click","share_native","share_copy","share_cancel"].includes(name))send(name);};
    send("page_view");if(card)send("card_open");measureScroll();
    const timer=window.setInterval(()=>{
      const now=Date.now(),delta=Math.min(2,(now-lastTick)/1000);lastTick=now;
      if(document.visibilityState!=="visible"||now-lastInteraction>60000)return;
      seconds+=delta;measureScroll();
      if(card&&!read&&seconds>=20&&scroll>=50){read=true;send("card_read");}
    },1000);
    for(const name of ["scroll","pointerdown","keydown","touchstart"])window.addEventListener(name,interact,{passive:true});
    document.addEventListener("visibilitychange",visibility);window.addEventListener("grimorio:analytics-event",share);
    return()=>{live=false;clearInterval(timer);for(const name of ["scroll","pointerdown","keydown","touchstart"])window.removeEventListener(name,interact);document.removeEventListener("visibilitychange",visibility);window.removeEventListener("grimorio:analytics-event",share);};
  },[accepted,path]);
  async function choose(consent:"accepted"|"rejected") {
    setSaving(true);setError("");enabled.current=false;
    try {
      const response=await fetch("/api/analytics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({consent})});
      if(!response.ok)throw new Error();
      enabled.current=consent==="accepted" && !!status?.enabled && !status.excluded;
      setStatus(old=>old?{...old,consent}:old);setPreferences(false);
      if(consent==="rejected")try{sessionStorage.removeItem(SESSION);}catch{}
    } catch {enabled.current=accepted;setError("Scelta non salvata. Riprova.");}
    finally {setSaving(false);}
  }
  const show=status?.enabled && (preferences||(!status.excluded&&status.consent===null));
  return show ? <aside role="region" aria-label="Preferenze statistiche" className="fixed inset-x-3 bottom-[calc(100px+env(safe-area-inset-bottom,0px))] z-50 mx-auto max-w-lg rounded-2xl border border-primary/30 bg-card p-4 shadow-2xl">
    <h2 className="font-serif text-xl text-foreground">Statistiche facoltative</h2>
    <p className="mt-2 text-sm leading-5 text-muted">Ci aiuti a migliorare il Grimorio? Con il tuo consenso misuriamo visite, schede consultate e condivisioni tramite PostHog in UE. Puoi cambiare scelta in qualsiasi momento.</p>
    <Link href="/privacy" className="mt-2 inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">Come usiamo i dati</Link>
    {error&&<p role="alert" className="mb-2 text-sm text-destructive">{error}</p>}
    <div className="grid grid-cols-2 gap-3"><button disabled={saving} onClick={()=>void choose("rejected")} className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground disabled:opacity-50">Rifiuta statistiche</button><button disabled={saving} onClick={()=>void choose("accepted")} className="min-h-11 rounded-lg border border-primary/40 px-3 py-2 text-sm text-primary disabled:opacity-50">Accetta statistiche</button></div>
  </aside> : null;
}
export function AnalyticsPreferencesButton() {
  return <button type="button" onClick={()=>window.dispatchEvent(new Event("grimorio:analytics-preferences"))} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 py-2 text-sm text-primary">Preferenze statistiche</button>;
}
