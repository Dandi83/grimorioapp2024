import type { ReactNode } from "react";

import { showPartAction } from "@/app/actions/admin-sections";
import { HiddenTag } from "@/components/sections/hidden-tag";
import { SoonTag } from "@/components/sections/soon-tag";
import { SoonBlock } from "@/components/sections/soon-block";
import { partId, sectionParts, type PublicSectionKey } from "@/lib/public-sections";
import { partState, sectionView } from "@/lib/section-view";

/**
 * A part of a page that can be hidden from /admin/sezioni (a block, a comparison box): not drawn for
 * the public while hidden; the administrator sees it with «Nascosta» and the «Mostra» link above.
 */
export async function PartBlock({ section, part, children, className }: { section: PublicSectionKey; part: string; children: ReactNode; className?: string }) {
  const id = partId(section, part);
  const [state, { soon }] = await Promise.all([partState(section, part), sectionView()]);
  const coming = soon.includes(id);
  // «In arrivo»: the public gets its place (name, pill, «Ci stiamo lavorando»), never its content.
  if (!state.shown) return coming ? <SoonBlock id={id} title={sectionParts(section).find(item => item.key === part)?.title ?? ""} className={className} /> : null;
  return (
    <div data-part={id} className={className}>
      {state.hidden && <HiddenPartBar id={id} />}
      {children}
    </div>
  );
}

/** «Nascosta» (or «In arrivo») and «Mostra» above a part the public does not see, for the administrator. */
export async function HiddenPartBar({ id }: { id: string }) {
  const { soon } = await sectionView();
  return (
    <form action={showPartAction} className="flex items-center gap-2">
      {soon.includes(id) ? <SoonTag /> : <HiddenTag />}
      <input type="hidden" name="parte" value={id} />
      <button type="submit" className="min-h-11 px-1 text-[14px] font-bold text-primary underline underline-offset-4">Mostra</button>
    </form>
  );
}
