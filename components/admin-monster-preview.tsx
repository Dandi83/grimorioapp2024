import type { Monster } from "@/lib/monsters-types";
import { abilityMod } from "@/lib/monsters-types";
import { inlineConditionReferences } from "@/lib/conditions";
import { formatMonsterSpellLists, inlineSpellReferences } from "@/lib/spell-references";
import { MonsterText, ReferenceText } from "./html-text";
import { RulesEditionBadge } from "./rules-edition-badge";

export function AdminMonsterPreview({monster,legacy}: {monster:Partial<Monster>;legacy:boolean}) {
  const references = legacy ? [] : inlineConditionReferences;
  return <article className="monster-sheet min-w-0 rounded-xl border border-primary/20 bg-background py-5">
    <header className="px-6 pb-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Anteprima · non ancora salvata</p>
      <h2 className="break-words font-serif text-3xl text-foreground">{monster.nome || "Nome del mostro"}</h2>
      <RulesEditionBadge edition={monster.edizione} compact />
      <p className="mt-1 text-sm text-muted-foreground">{monster.sottotitolo_fonte || [monster.taglia,monster.tipo,monster.allineamento].filter(Boolean).join(" · ")}</p>
      {legacy && <p className="mt-2 text-xs text-muted-foreground">Regole D&D 2014: richiami alle regole 2024 disattivati.</p>}
    </header>
    <dl className="grid grid-cols-2 gap-3 px-6 pb-6">
      {([["CA",monster.classe_armatura],["PF",monster.punti_ferita],["Velocità",monster.velocita],["GS",monster.grado_sfida],["PX",monster.px],["Iniziativa",monster.iniziativa],["Bonus di competenza",monster.bonus_competenza]] as const).filter(([label,value])=>value || !["Iniziativa","Bonus di competenza"].includes(label)).map(([label,value])=><div key={label} className="min-w-0 rounded-xl border border-border bg-card p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words text-base">{value || "—"}</dd></div>)}
    </dl>
    <section data-monster-section><h2>Caratteristiche</h2>
      <div className="grid grid-cols-3 gap-3">{([['FOR','forza'],['DES','destrezza'],['COS','costituzione'],['INT','intelligenza'],['SAG','saggezza'],['CAR','carisma']] as const).map(([label,key])=>{
        const value=monster[key] ?? 10;
        return <div key={key} className="rounded-xl border border-border bg-card py-3 text-center"><span className="block text-xs text-muted-foreground">{label}</span><span className="block font-serif text-xl">{value}</span><span className="text-xs text-primary">{abilityMod(value)}</span></div>;
      })}</div>
    </section>
    <dl className="mx-6 mb-6 space-y-1 rounded-xl border border-border bg-card p-4 text-sm leading-6">
      {([['Tiri salvezza','tiri_salvezza'],['Abilità','abilita'],['Vulnerabilità','vulnerabilita'],['Resistenze','resistenze'],['Immunità ai danni','immunita_danni'],['Immunità alle condizioni','immunita_condizioni'],['Immunità','immunita'],['Attrezzatura','attrezzatura'],['Sensi','sensi'],['Linguaggi','linguaggi']] as const).map(([label,key])=>monster[key] ? <div key={key}><dt className="inline font-semibold text-primary">{label}: </dt><dd className="inline"><ReferenceText text={monster[key]!} references={references} damageIcons damageContext={label} /></dd></div> : null)}
    </dl>
    {([['Tratti','tratti'],['Azioni','azioni'],['Azioni bonus','azioni_bonus'],['Reazioni','reazioni'],['Azioni leggendarie','azioni_leggendarie'],['Descrizione','descrizione']] as const).map(([title,key])=>monster[key] ? <section key={key} data-monster-section><h2>{title}</h2><MonsterText html={legacy ? monster[key]! : formatMonsterSpellLists(monster[key]!)} references={references} spellReferences={legacy ? [] : inlineSpellReferences(monster[key]!)} damageIcons /></section> : null)}
  </article>;
}
