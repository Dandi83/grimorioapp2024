import { Breadcrumbs } from "@/components/seo/json-ld";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";

import { ClassIcon } from "@/components/classes/class-icon";
import { ClassListEditions } from "@/components/classes/class-editions";
import { ParentLink } from "@/components/section-tiles";
import { getCorrectedClasses } from "@/lib/corrected-content";
import { pageEditions, sectionPage } from "@/lib/section-view";
import { CLASS_COLORS, classHref, hitDie, primaryAbilities, type ClassEntry } from "@/lib/classes";
import type { ClassEdition } from "@/lib/classes-types";

export const metadata = pageMetadata({ name: "Classi", section: "Compendio", path: "/classi",
  description: "Le classi di D&D 5e in italiano, edizioni 2014 e 2024: privilegi per livello, sottoclassi e tabelle, dal Barbaro al Mago." });
// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

function ClassGrid({ entries, edition }: { entries: ClassEntry[]; edition: ClassEdition }) {
  const cards = entries.flatMap(entry => (entry.editions[edition] ? [{ id: entry.id, card: entry.editions[edition]! }] : []));
  return (
    <>
      <p className="mt-2 text-[15px] leading-6 text-muted">{cards.length} classi, ognuna con la sua sottoclasse del manuale.</p>
      <ul className="mt-4 grid grid-cols-2 gap-[10px] md:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {cards.map(({ id, card }) => (
          <li key={id} className="min-w-0">
            <Link href={classHref(id)} className="flex h-full min-h-[132px] flex-col rounded-[14px] border border-border bg-card p-3 shadow-[0_1px_0_var(--color-divider)]">
              <span className="grid size-10 place-items-center rounded-[10px] text-white" style={{ background: CLASS_COLORS[id] }}>
                <ClassIcon id={id} size={22} />
              </span>
              <span className="mt-2 font-serif text-[21px] font-bold leading-tight">{card.nome}</span>
              <span className="mt-0.5 text-[13px] leading-snug text-muted">
                <strong className="font-bold text-foreground">{hitDie(card)}</strong>
                {primaryAbilities(card) ? ` · ${primaryAbilities(card)}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[13px] leading-5 text-muted">
        {edition === "2024" ? "Dado Vita · caratteristica primaria" : "Dadi Vita"}. Fonte: <Link href="/fonti" className="underline underline-offset-4">{edition === "2024" ? "SRD 5.2.1" : "SRD 5.1"} (CC-BY-4.0)</Link>.
      </p>
    </>
  );
}

export default async function ClassesPage() {
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  await sectionPage("classi");
  const { list } = await getCorrectedClasses();
  // An edition hidden from /admin/sezioni is not in the page.
  const shown = await pageEditions("classi");
  return (
    <>
      <Breadcrumbs crumbs={[{ name: "Compendio", path: "/compendio" }, { name: "Classi", path: "/classi" }]} />
    <div className="px-4 pb-8 pt-4 sm:px-6">
      <ParentLink href="/compendio" label="Compendio" />
      <ClassListEditions
        title={<h1 className="font-serif text-[34px] font-bold leading-tight">Classi</h1>}
        panels={{
          ...(shown.includes("2024") ? { "2024": <ClassGrid entries={list} edition="2024" /> } : {}),
          ...(shown.includes("2014") ? { "2014": list.some(entry => entry.editions["2014"])
            ? <ClassGrid entries={list} edition="2014" />
            : <p role="note" className="mt-4 rounded-[14px] border border-border bg-card px-4 py-3 text-[15px] font-semibold text-muted">Le classi 2014 (SRD 5.1) sono in arrivo. Per ora scegli 2024.</p> } : {}),
        }}
      />
    </div>
    </>
  );
}
