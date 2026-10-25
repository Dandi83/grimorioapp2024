import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { RuleContent } from "@/components/rule-content";
import { RulesEditionBadge } from "@/components/rules-edition-badge";
import { concentrationRules, getRule } from "@/lib/concentration";

// A rule opened from a spell card (the «Concentrazione» of its Durata), like a condition: text of the SRD only.
export const dynamicParams = false;

export function generateStaticParams() {
  return concentrationRules.map(rule => ({ id: rule.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rule = getRule(id);
  return { title: `${rule?.title || "Voce non trovata"}${rule?.edizione === "2014" ? " (2014)" : ""} — Regole · Il Grimorio.App` };
}

export default async function RulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rule = getRule(id);
  if (!rule) notFound();
  return (
    <article className="min-w-0 px-6 py-7">
      <div className="relative -ml-4 h-12"><BackButton fallback="/grimorio" /></div>
      <header className="mb-6 mt-3 border-b border-primary/40 pb-5">
        <p className="mb-2 text-xs uppercase tracking-widest text-primary">Regole · {rule.chapter}</p>
        <h1 className="font-serif text-4xl font-bold leading-tight text-foreground">{rule.title}</h1>
        {rule.edizione === "2014" && <RulesEditionBadge edition="2014" />}
      </header>
      <RuleContent rule={rule} />
    </article>
  );
}
