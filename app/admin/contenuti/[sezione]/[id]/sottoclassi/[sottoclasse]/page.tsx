import Link from "next/link";
import { notFound } from "next/navigation";

import { SubclassEditor } from "@/components/admin-subclass/subclass-editor";
import { EditionChip } from "@/components/admin-edition/edition-chip";
import { HiddenTag } from "@/components/sections/hidden-tag";
import { NoSrdTag } from "@/components/classes/subclass-card";
import { AdminLogin } from "@/components/admin-login";
import { isAdmin } from "@/lib/admin-auth";
import { safeReturnPath } from "@/lib/admin-edit-link";
import { classEntries } from "@/lib/classes";
import { cardPath, hiddenCardPaths } from "@/lib/section-visibility";
import { getSubclass } from "@/lib/subclasses";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modifica sottoclasse — Il Grimorio.App", robots: { index: false, follow: false } };

/** The editor of a subclass added by the administrator; opened with «Modifica» from the class sheet, it goes back there. */
export default async function EditSubclassPage({ params, searchParams }: {
  params: Promise<{ sezione: string; id: string; sottoclasse: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdmin())) return <AdminLogin />;
  const { sezione, id, sottoclasse } = await params;
  const row = await getSubclass(decodeURIComponent(sottoclasse));
  const entry = classEntries.find(item => item.id === id);
  if (sezione !== "classi" || !row || !entry || row.classe !== entry.id) notFound();
  const card = entry.editions[row.edizione];
  if (!card) notFound();
  const hidden = (await hiddenCardPaths().catch((): string[] => [])).includes(cardPath("sottoclasse", row.id));
  const list = `/admin/contenuti/classi/${id}?edizione=${row.edizione}`;
  const back = safeReturnPath((await searchParams).ritorno) ?? list;
  return (
    <div className="mx-auto flex max-w-2xl lg:max-w-[1200px] flex-col gap-3 px-4 pb-8 pt-4">
      <Link href={list} className="inline-flex min-h-11 items-center self-start text-[15px] font-bold text-primary">‹ {card.nome}</Link>
      <EditionChip edition={row.edizione} />
      <h1 className="font-serif text-[28px] font-bold leading-tight text-primary">Modifica sottoclasse ({row.edizione})</h1>
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted"><NoSrdTag />{hidden ? <><HiddenTag /> Nascosta al pubblico: la mostri con l’occhio nella pagina della classe.</> : "Visibile al pubblico."}</p>
      <SubclassEditor id={row.id} initial={row.scheda} from={card.livelloSottoclasse} back={back} />
    </div>
  );
}
