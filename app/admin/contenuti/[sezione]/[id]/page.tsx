import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminContentForm } from "@/components/admin-content/content-form";
import { OtherEditionNotice } from "@/components/admin-edition/edition-bar";
import { EditionChip } from "@/components/admin-edition/edition-chip";
import { adminEdition } from "@/lib/admin-edition-server";
import { AdminLogin } from "@/components/admin-login";
import { isAdmin } from "@/lib/admin-auth";
import { activeOverrideMap, overrideKey } from "@/lib/content-overrides-apply";
import { allOverrides } from "@/lib/content-overrides";
import { cardFields, isContentEdition, sectionSpec } from "@/lib/content-sections";
import { safeReturnPath } from "@/lib/admin-edit-link";
import { AdminSubclassList } from "@/components/admin-subclass/subclass-list";
import { cardPath, hiddenCardPaths } from "@/lib/section-visibility";
import { listSubclasses } from "@/lib/subclasses";

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
  const query = await searchParams;
  const requested = query.edizione;
  // Opened with «Modifica» from a public page: «Annulla» and saving go back to it.
  const ritorno = safeReturnPath(query.ritorno);
  const chosen = await adminEdition();
  // The edition of the link; without one, the edition of the admin area when the card exists there.
  const edition = isContentEdition(requested) && section.editions.includes(requested) ? requested
    : section.editions.includes(chosen) && section.original(id, chosen) ? chosen : section.editions[0];
  const original = section.original(id, edition);
  if (!original) notFound();
  const active = activeOverrideMap((await allOverrides()).filter(row => row.sezione === section.key && row.scheda_id === id));
  const fields = cardFields(section, original, id, edition).map(field => {
    const row = active.get(overrideKey(section.key, id, edition, field.name));
    return { ...field, original: original[field.name], current: row ? row.valore_nuovo : original[field.name], motivo: row?.motivo };
  });
  const back = ritorno ?? `/admin/contenuti/${section.key}`;
  // A class: the subclasses added by the administrator in this edition, with «+ Nuova sottoclasse».
  const subclasses = section.key === "classi" ? (await listSubclasses().catch(() => [])).filter(row => row.classe === id && row.edizione === edition) : [];
  const hiddenPaths = section.key === "classi" ? new Set(await hiddenCardPaths().catch((): string[] => [])) : new Set<string>();
  return (
    <div className="mx-auto flex max-w-2xl lg:max-w-[1200px] flex-col gap-3 px-4 pb-8 pt-4">
      <Link href={`/admin/contenuti/${section.key}`} className="inline-flex min-h-11 items-center self-start text-[15px] font-bold text-primary">‹ {section.title}</Link>
      <EditionChip edition={edition} />
      {edition !== chosen && <OtherEditionNotice current={chosen} target={edition} message={`Questa voce è dell’edizione ${edition}, ma stai modificando l’edizione ${chosen}. Le modifiche valgono solo per questa voce ${edition}.`} />}
      <h1 className="font-serif text-[28px] font-bold leading-tight text-primary">{fields.find(field => field.name === "nome" || field.name === "title")?.current ?? id} ({edition})</h1>
      <a href={section.href(id, edition)} className="self-start text-sm text-primary underline underline-offset-4">Apri la scheda pubblica</a>
      {section.key === "classi" && (
        <AdminSubclassList classe={id} className={String(original.nome ?? id)} edition={edition}
          items={subclasses.map(row => ({ id: row.id, nome: row.scheda.nome }))}
          hidden={subclasses.filter(row => hiddenPaths.has(cardPath("sottoclasse", row.id))).map(row => row.id)} />
      )}
      <AdminContentForm section={section.key} id={id} edition={edition} fields={fields} back={back} returnTo={ritorno} />
      <section aria-labelledby="bloccati" className="mt-2 rounded-[14px] border border-border bg-card p-3.5 text-[13px] text-muted">
        <h2 id="bloccati" className="font-bold text-foreground">Non modificabili qui</h2>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {section.locked.map(item => <li key={item.label}><b>{item.label}</b>: {item.why}.</li>)}
        </ul>
      </section>
    </div>
  );
}
