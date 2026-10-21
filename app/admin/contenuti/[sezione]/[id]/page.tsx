import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminContentForm } from "@/components/admin-content/content-form";
import { AdminLogin } from "@/components/admin-login";
import { isAdmin } from "@/lib/admin-auth";
import { activeOverrideMap, overrideKey } from "@/lib/content-overrides-apply";
import { allOverrides } from "@/lib/content-overrides";
import { cardFields, isContentEdition, sectionSpec } from "@/lib/content-sections";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modifica scheda — Il Grimorio.App", robots: { index: false, follow: false } };

export default async function ContentEditPage({ params, searchParams }: {
  params: Promise<{ sezione: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdmin())) return <AdminLogin />;
  const { sezione, id } = await params;
  const section = sectionSpec(sezione);
  if (!section) notFound();
  const requested = (await searchParams).edizione;
  const edition = isContentEdition(requested) && section.editions.includes(requested) ? requested : section.editions[0];
  const original = section.original(id, edition);
  if (!original) notFound();
  const active = activeOverrideMap((await allOverrides()).filter(row => row.sezione === section.key && row.scheda_id === id));
  const fields = cardFields(section, original).map(field => {
    const row = active.get(overrideKey(section.key, id, edition, field.name));
    return { ...field, original: original[field.name], current: row ? row.valore_nuovo : original[field.name], motivo: row?.motivo };
  });
  const back = `/admin/contenuti/${section.key}?edizione=${edition}`;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pb-8 pt-4">
      <Link href={back} className="inline-flex min-h-11 items-center self-start text-[15px] font-bold text-primary">‹ {section.title}</Link>
      <h1 className="font-serif text-[28px] font-bold leading-tight text-primary">{fields.find(field => field.name === "nome")?.current ?? id} ({edition})</h1>
      <a href={section.href(id, edition)} className="self-start text-sm text-primary underline underline-offset-4">Apri la scheda pubblica</a>
      <AdminContentForm section={section.key} id={id} edition={edition} fields={fields} back={back} />
      <section aria-labelledby="bloccati" className="mt-2 rounded-[14px] border border-border bg-card p-3.5 text-[13px] text-muted">
        <h2 id="bloccati" className="font-bold text-foreground">Non modificabili qui</h2>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {section.locked.map(item => <li key={item.label}><b>{item.label}</b>: {item.why}.</li>)}
        </ul>
      </section>
    </div>
  );
}
