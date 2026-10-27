import Link from "next/link";

import { SoonTag } from "@/components/sections/soon-tag";
import { soonHref } from "@/lib/public-sections";

/** The place of a block «In arrivo»: attenuated, dashed border, the pill, to the «in costruzione» page. */
export function SoonBlock({ id, title, className = "" }: { id: string; title: string; className?: string }) {
  return (
    <div data-part={id} data-soon="" className={className}>
      <Link href={soonHref(id)} prefetch={false} className="flex min-h-14 flex-wrap items-center gap-x-2 gap-y-1 rounded-[14px] border border-dashed border-[#C9B48A] bg-[#FBF6EA] px-4 py-3 text-muted">
        <span className="font-serif text-[18px] font-bold">{title.replace(/[«»]/g, "")}</span>
        <SoonTag />
        <span className="w-full text-[14px]">Ci stiamo lavorando</span>
      </Link>
    </div>
  );
}
