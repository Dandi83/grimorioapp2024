import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminList } from "@/components/admin-list/admin-list";
import { OtherEditionNotice } from "@/components/admin-edition/edition-bar";
import { adminEdition } from "@/lib/admin-edition-server";
import { AdminLogin } from "@/components/admin-login";
import { isAdmin } from "@/lib/admin-auth";
import { contentList } from "@/lib/admin-lists";
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
      <div className="mx-auto flex max-w-2xl lg:max-w-[1200px] flex-col gap-3 px-4 pb-8 pt-4">
        <Link href="/admin/contenuti" className="inline-flex min-h-11 items-center self-start text-[15px] font-bold text-primary">‹ Contenuti</Link>
        <h1 className="font-serif text-[30px] font-bold text-primary">{section.title}</h1>
        <OtherEditionNotice current={chosen} target={only} message={`${section.title} ha solo l’edizione ${only}: nell’edizione ${chosen} non c’è niente da modificare.`} />
      </div>
    );
  }
  const edition = chosen;
  const linked = isContentEdition(requested) && requested !== edition && section.editions.includes(requested) ? requested : undefined;
  const data = await contentList(section.key, edition);
  if (!data) notFound();
  return (
    <>
      {linked && <div className="mx-auto max-w-[1200px] px-4 pt-3"><OtherEditionNotice current={edition} target={linked} message={`Il link apriva l’edizione ${linked}: qui vedi l’edizione ${edition}.`} /></div>}
      <AdminList data={data} />
    </>
  );
}
