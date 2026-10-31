import type { ReactNode } from "react";
import Link from "next/link";
import { allProposals, readSearchEnglish } from "@/lib/search-english-server";
import { Languages, Backpack, BookOpen, ChevronLeft, ChevronRight, Crown, Gem, Hammer, HeartPulse, Shield, Skull, Sparkles, Sword, type LucideIcon } from "lucide-react";

import { AdminGlobalSearch } from "@/components/admin-home/global-search";
import { AdminLogin } from "@/components/admin-login";
import { isAdmin } from "@/lib/admin-auth";
import { spellEdition } from "@/lib/admin-edition";
import { adminEdition } from "@/lib/admin-edition-server";
import { editableEntries } from "@/lib/admin-lists";
import { CONTENT_SECTIONS } from "@/lib/content-sections";
import { homebrewMonster, publishedHomebrew } from "@/lib/homebrew";
import { getAllMonsters } from "@/lib/monsters";
import { partId, PUBLIC_SECTIONS, type PublicSectionKey } from "@/lib/public-sections";
import { allSectionStates, COMMUNITY_PART, type SectionState } from "@/lib/section-visibility";
import { communityPublic } from "@/lib/community";
import { getAdminSpells } from "@/lib/spells";
import { usesLegacyMonsterRules } from "@/lib/srd-monsters";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contenuti — Il Grimorio.App", robots: { index: false, follow: false } };

/** The rows of the three groups: list, icon, public section (for the state the visitors have). */
const GROUPS: { label: string; rows: { key: string; name: string; Icon: LucideIcon; section?: PublicSectionKey; note?: string }[] }[] = [
  { label: "Schede", rows: [
    { key: "incantesimi", name: "Incantesimi", Icon: Sparkles, section: "incantesimi" },
    { key: "mostri", name: "Mostri", Icon: Skull, section: "bestiario", note: "con le Creature originali" },
    { key: "oggetti-magici", name: "Oggetti magici", Icon: Gem, section: "oggetti-magici" },
    { key: "condizioni", name: "Condizioni", Icon: HeartPulse, section: "condizioni" },
    { key: "classi", name: "Classi", Icon: Crown, section: "classi" },
  ] },
  { label: "Equipaggiamento", rows: [
    { key: "armi", name: "Armi", Icon: Sword, section: "armi" },
    { key: "armature", name: "Armature", Icon: Shield, section: "armature" },
    { key: "avventura", name: "Equipaggiamento d’avventura", Icon: Backpack, section: "avventura" },
    { key: "strumenti", name: "Strumenti", Icon: Hammer, section: "strumenti" },
  ] },
  { label: "Regole", rows: [{ key: "manuale", name: "Manuale", Icon: BookOpen }] },
];

const STATE_NOTE: Record<Exclude<SectionState, "visibile">, string> = { "in-arrivo": "In arrivo per gli utenti", nascosta: "Nascosta agli utenti" };

/** «Contenuti»: every list of the chosen edition, in three groups, with the number of cards and what the visitors see. */
export default async function ContentsPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const edition = await adminEdition();
  const [spells, monsters, homebrew, states, entries, decisions] = await Promise.all([
    getAdminSpells().catch(() => null), getAllMonsters().catch(() => null), publishedHomebrew().catch(() => []), allSectionStates().catch(() => ({} as Record<string, SectionState>)), editableEntries(edition),
    readSearchEnglish().catch(() => null),
  ]);
  // «Nomi inglesi da verificare» (PROMPT 37): the proposals of the project not approved or discarded yet.
  const decided = new Set((decisions ?? []).map(row => `${row.kind}:${row.id}`));
  const toCheck = decisions ? allProposals().filter(row => !decided.has(`${row.kind}:${row.id}`)).length : null;
  const count = (key: string): number | null => {
    if (key === "incantesimi") return spells?.filter(spell => spellEdition(spell) === edition).length ?? null;
    if (key === "mostri") return monsters ? monsters.filter(monster => (usesLegacyMonsterRules(monster) ? "2014" : "2024") === edition).length
      + homebrew.filter(row => row.edizione === edition || row.edizione === "entrambe").map(homebrewMonster).length : null;
    const section = CONTENT_SECTIONS.find(item => item.key === key);
    return section && section.editions.includes(edition) ? section.items(edition).length : null;
  };
  const href = (key: string) => (key === "incantesimi" ? "/admin/incantesimi" : key === "mostri" ? "/admin/mostri" : `/admin/contenuti/${key}`);
  // What the visitors see: the section, else its parts «in arrivo» and «nascoste», counted apart (PROMPT 29); the part
  // of the community closed by the switch of lib/community.ts is hidden whatever its state.
  const note = (section?: PublicSectionKey): string | undefined => {
    if (!section) return undefined;
    const state = states[section] ?? "visibile";
    if (state !== "visibile") return STATE_NOTE[state];
    const spec = PUBLIC_SECTIONS.find(item => item.key === section);
    const partState = (id: string): SectionState => (id === COMMUNITY_PART && !communityPublic() ? "nascosta" : states[id] ?? "visibile");
    const ids = (spec?.parts ?? []).map(part => partId(section, part.key));
    const soon = ids.filter(id => partState(id) === "in-arrivo").length, hidden = ids.filter(id => partState(id) === "nascosta").length;
    const said = [soon ? `${soon} ${soon === 1 ? "parte in arrivo" : "parti in arrivo"}` : "", hidden ? `${hidden} ${hidden === 1 ? "parte nascosta" : "parti nascoste"}` : ""].filter(Boolean);
    return said.length ? `${said.join(" · ")} per gli utenti` : undefined;
  };
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-10 pt-3 lg:max-w-[960px]">
      <Link href="/admin" className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start px-2 text-[15px] font-bold text-[#7A1F2B]"><ChevronLeft size={18} aria-hidden="true" /> Area riservata</Link>
      <h1 className="font-serif text-[32px] font-bold leading-tight text-[#7A1F2B]">Contenuti {edition}</h1>
      <AdminGlobalSearch entries={entries} />
      {GROUPS.map(group => {
        const rows = group.rows.flatMap(row => { const n = count(row.key); return n === null ? [] : [{ ...row, n }]; });
        if (!rows.length) return null;
        return (
          <Group key={group.label} label={group.label}>
            {rows.map(row => {
              const state = note(row.section);
              return (
                <li key={row.key}>
                  <Link href={href(row.key)} prefetch={false} aria-label={[row.name, String(row.n), state].filter(Boolean).join(" · ")} data-content-row={row.key}
                    className="flex min-h-[60px] items-center gap-3 px-4 py-2 focus-visible:outline-[3px] focus-visible:-outline-offset-[3px] focus-visible:outline-[#7A1F2B]">
                    <row.Icon size={22} strokeWidth={1.8} color="#7A1F2B" className="shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-serif text-[19px] font-bold leading-tight">{row.name}</span>
                      {(row.note || state) && <span className={`block text-[13px] ${state ? "font-semibold text-[#7A4E00]" : "text-[#5E4E3E]"}`}>{state ?? row.note}</span>}
                    </span>
                    <span className="text-[16px] font-semibold tabular-nums text-[#5E4E3E]">{row.n}</span>
                    <ChevronRight size={18} strokeWidth={2.2} className="shrink-0 text-[#B9A57C]" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </Group>
        );
      })}
      <Group label="Ricerca">
        <li>
          <Link href="/admin/contenuti/nomi-inglesi" prefetch={false} data-content-row="nomi-inglesi"
            className="flex min-h-[60px] items-center gap-3 px-4 py-2 focus-visible:outline-[3px] focus-visible:-outline-offset-[3px] focus-visible:outline-[#7A1F2B]">
            <Languages size={22} strokeWidth={1.8} color="#7A1F2B" className="shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-[19px] font-bold leading-tight">Nomi inglesi da verificare</span>
              <span className="block text-[13px] text-[#5E4E3E]">Solo per trovare le schede NO SRD cercando in inglese</span>
            </span>
            {toCheck !== null && <span className="text-[16px] font-semibold tabular-nums text-[#5E4E3E]">{toCheck}</span>}
            <ChevronRight size={18} strokeWidth={2.2} className="shrink-0 text-[#B9A57C]" aria-hidden="true" />
          </Link>
        </li>
      </Group>
    </main>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  const id = `gruppo-${label.toLowerCase()}`;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="px-1 pb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-[#5E4E3E]">{label}</h2>
      <ul className="divide-y divide-[#DDCFAE]/70 overflow-hidden rounded-[16px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0]">{children}</ul>
    </section>
  );
}
