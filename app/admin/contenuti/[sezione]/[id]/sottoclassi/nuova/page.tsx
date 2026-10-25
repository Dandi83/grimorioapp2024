import Link from "next/link";
import { notFound } from "next/navigation";

import { SubclassEditor } from "@/components/admin-subclass/subclass-editor";
import { EditionChip } from "@/components/admin-edition/edition-chip";
import { AdminLogin } from "@/components/admin-login";
import { adminEdition } from "@/lib/admin-edition-server";
import { isAdmin } from "@/lib/admin-auth";
import { classEntries } from "@/lib/classes";
import { emptySubclass } from "@/lib/subclass-types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuova sottoclasse — Il Grimorio.App", robots: { index: false, follow: false } };

/**
 * «+ Nuova sottoclasse» of a class: the features at the levels of the SRD subclasses of that class and edition,
 * name and text empty (the app writes no text). Saved hidden.
 */
export default async function NewSubclassPage({ params, searchParams }: {
  params: Promise<{ sezione: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdmin())) return <AdminLogin />;
  const { sezione, id } = await params;
  const entry = classEntries.find(item => item.id === id);
  if (sezione !== "classi" || !entry) notFound();
  const requested = (await searchParams).edizione;
  const edition = requested === "2014" || requested === "2024" ? requested : await adminEdition();
  const card = entry.editions[edition];
  if (!card) notFound();
  const back = `/admin/contenuti/classi/${id}?edizione=${edition}`;
  return (
    <div className="mx-auto flex max-w-2xl lg:max-w-[1200px] flex-col gap-3 px-4 pb-8 pt-4">
      <Link href={back} className="inline-flex min-h-11 items-center self-start text-[15px] font-bold text-primary">‹ {card.nome}</Link>
      <EditionChip edition={edition} />
      <h1 className="font-serif text-[28px] font-bold leading-tight text-primary">Nuova sottoclasse · {card.nome} ({edition})</h1>
      <p className="text-sm text-muted">Privilegi già pronti ai livelli delle sottoclassi {edition} di questa classe ({card.livelliSottoclasse.join(", ")}): scrivi nomi e testi con parole tue. Nasce nascosta.</p>
      <SubclassEditor initial={emptySubclass(entry.id, edition, card.livelliSottoclasse)} from={card.livelloSottoclasse} back={back} />
    </div>
  );
}
