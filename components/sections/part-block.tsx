import type { ReactNode } from "react";

import { showPartAction } from "@/app/actions/admin-sections";
import { HiddenTag } from "@/components/sections/hidden-tag";
import { partId, type PublicSectionKey } from "@/lib/public-sections";
import { partState } from "@/lib/section-view";

/**
 * A part of a page that can be hidden from /admin/sezioni (a block, a comparison box): not drawn for
 * the public while hidden; the administrator sees it with «Nascosta» and the «Mostra» link above.
 */
export async function PartBlock({ section, part, children, className }: { section: PublicSectionKey; part: string; children: ReactNode; className?: string }) {
  const state = await partState(section, part);
  if (!state.shown) return null;
  return (
    <div data-part={partId(section, part)} className={className}>
      {state.hidden && <HiddenPartBar id={partId(section, part)} />}
      {children}
    </div>
  );
}

/** «Nascosta» and «Mostra» above a hidden part, for the administrator. */
export function HiddenPartBar({ id }: { id: string }) {
  return (
    <form action={showPartAction} className="flex items-center gap-2">
      <HiddenTag />
      <input type="hidden" name="parte" value={id} />
      <button type="submit" className="min-h-11 px-1 text-[14px] font-bold text-primary underline underline-offset-4">Mostra</button>
    </form>
  );
}
