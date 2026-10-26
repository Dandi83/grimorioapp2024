import { EyeOff } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { showSectionAction } from "@/app/actions/admin-sections";
import type { PublicSectionKey } from "@/lib/public-sections";
import { sectionView } from "@/lib/section-view";

/**
 * Layout of the pages of one public section (list and cards). Hidden: the public gets the
 * «Sezione momentaneamente in costruzione» page (404, app/not-found.tsx); the administrator
 * sees the pages with a dark band on top and the «Mostra» link.
 */
export async function SectionGate({ section, children }: { section: PublicSectionKey; children: ReactNode }) {
  const view = await sectionView();
  if (!view.hidden.includes(section)) return children;
  if (!view.admin) notFound();
  return (
    <>
      <HiddenBand section={section} soon={view.soon.includes(section)} />
      {children}
    </>
  );
}

function HiddenBand({ section, soon }: { section: PublicSectionKey; soon: boolean }) {
  return (
    <div role="note" className="flex items-center gap-2.5 bg-[#2B2118] px-4 py-1.5 text-[14px] leading-5 text-[#FFFBF0]">
      <EyeOff size={20} className="shrink-0 text-amber" aria-hidden="true" />
      {soon
        ? <p className="min-w-0 flex-1 py-1.5"><b className="text-amber">In arrivo</b> · il pubblico vede la voce attenuata e la pagina «in costruzione». Il contenuto lo vedi solo tu.</p>
        : <p className="min-w-0 flex-1 py-1.5"><b>Nascosta</b> · il pubblico non vede questa sezione. La vedi solo tu.</p>}
      <form action={showSectionAction} className="shrink-0">
        <input type="hidden" name="sezione" value={section} />
        <button type="submit" className="min-h-11 px-2 font-bold text-amber underline underline-offset-4">Mostra</button>
      </form>
    </div>
  );
}
