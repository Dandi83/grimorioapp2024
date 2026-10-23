import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminContentList } from "@/components/admin-content/content-list";
import { OtherEditionNotice } from "@/components/admin-edition/edition-bar";
import { adminEdition } from "@/lib/admin-edition-server";
import { AdminLogin } from "@/components/admin-login";
import { isAdmin } from "@/lib/admin-auth";
import { activeOverrideMap } from "@/lib/content-overrides-apply";
import { allOverrides } from "@/lib/content-overrides";
import { isContentEdition, sectionSpec } from "@/lib/content-sections";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modifica contenuti — Il Grimorio.App", robots: { index: false, follow: false } };

export default async function ContentSectionPage({ params, searchParams }: {
  params: Promise<{ sezione: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdmin())) return <AdminLogin />;
  const section = sectionSpec((await params).sezione);
  if (!section) notFound();
  // The edition comes from the switch at the top of the admin area; a link of the other edition says so.
  const chosen = await adminEdition();
  const requested = (await searchParams).edizione;
  if (!section.editions.includes(chosen)) {
    const only = section.editions[0];
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pb-8 pt-4">
        <Link href="/admin" className="inline-flex min-h-11 items-center self-start text-[15px] font-bold text-primary">‹ Amministrazione</Link>
        <h1 className="font-serif text-[30px] font-bold text-primary">{section.title}</h1>
        <OtherEditionNotice current={chosen} target={only} message={`${section.title} ha solo l’edizione ${only}: nell’edizione ${chosen} non c’è niente da modificare.`} />
      </div>
    );
  }
  const edition = chosen;
  const linked = isContentEdition(requested) && requested !== edition && section.editions.includes(requested) ? requested : undefined;
  const active = [...activeOverrideMap((await allOverrides()).filter(row => row.sezione === section.key && row.edizione === edition)).values()];
  const changed = new Set(active.map(row => row.scheda_id));
  const items = section.items(edition).map(item => ({ ...item, modificato: changed.has(item.id) }));
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pb-8 pt-4">
      <Link href="/admin" className="inline-flex min-h-11 items-center self-start text-[15px] font-bold text-primary">‹ Amministrazione</Link>
      <h1 className="font-serif text-[30px] font-bold text-primary">{section.title}</h1>
      {linked && <OtherEditionNotice current={edition} target={linked} message={`Il link apriva l’edizione ${linked}: qui vedi l’edizione ${edition}.`} />}
      <AdminContentList section={section.key} edition={edition} items={items} />
    </div>
  );
}
