"use client";

import Link from "next/link";

import { deleteSubclassAction } from "@/app/actions/admin-subclasses";
import { AdminDeleteButton } from "@/components/admin-delete-button";
import { EyeButton, useCardVisibility } from "@/components/admin-card-eye";
import { HiddenTag } from "@/components/sections/hidden-tag";
import { NoSrdTag } from "@/components/classes/subclass-card";

/**
 * The subclasses added to a class in this edition, in the admin page of the class: «+ Nuova sottoclasse», then
 * each one with the eye (born hidden), its editor and the bin. The SRD subclass is corrected in the form above.
 */
export function AdminSubclassList({ classe, className, edition, items, hidden }: {
  classe: string; className: string; edition: string; items: { id: string; nome: string }[]; hidden: string[];
}) {
  const visibility = useCardVisibility("sottoclasse", hidden);
  return (
    <section aria-labelledby="sottoclassi-aggiunte" className="rounded-[14px] border-[1.5px] border-border bg-card p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="sottoclassi-aggiunte" className="font-serif text-[20px] font-bold text-primary">Sottoclassi aggiunte ({edition})</h2>
        <Link href={`/admin/contenuti/classi/${classe}/sottoclassi/nuova?edizione=${edition}`} className="inline-flex min-h-11 items-center rounded-[22px] bg-primary px-4 text-[15px] font-bold text-primary-foreground">+ Nuova sottoclasse</Link>
      </div>
      <p className="mt-1 text-[13px] text-muted">Sottoclassi ufficiali non presenti nell’SRD, scritte con parole tue. Nascono nascoste: le mostri con l’occhio.</p>
      {items.length === 0 ? (
        <p className="mt-3 text-[15px] text-muted">Nessuna sottoclasse aggiunta a {className} {edition}.</p>
      ) : (
        <ul className="mt-2 divide-y divide-elevated" aria-label="Sottoclassi aggiunte">
          {items.map(item => {
            const isHidden = visibility.isHidden(item.id);
            return (
              <li key={item.id} className="flex items-center gap-1 py-1.5" data-subclass-row="">
                <Link href={`/admin/contenuti/classi/${classe}/sottoclassi/${item.id}`} className="flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-2 text-[16px] font-semibold">
                  <span className="min-w-0 break-words underline-offset-4 hover:underline">{item.nome}</span>
                  <NoSrdTag link={false} />{isHidden && <HiddenTag />}
                </Link>
                <EyeButton hidden={isHidden} nome={item.nome} onToggle={() => visibility.toggle(item.id, item.nome)} />
                <AdminDeleteButton id={item.id} nome={item.nome} action={deleteSubclassAction} />
              </li>
            );
          })}
        </ul>
      )}
      {visibility.notice}
    </section>
  );
}
