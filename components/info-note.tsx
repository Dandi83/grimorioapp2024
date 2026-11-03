import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The amber note «ℹ️ Perché …?» (PROMPT 51 in the classes, PROMPT 54 in /talenti): dashed amber border, light amber
 * background, the title in bold (not a heading, so the order of the headings stays the same), the text and the link
 * to /fonti. Drawn on the server.
 */
export function InfoNote({ title, children, ...data }: { title: string; children: ReactNode } & Record<`data-${string}`, string>) {
  return (
    <div role="note" {...data} className="rounded-[14px] border-2 border-dashed border-amber bg-[#FBF1D6] px-3.5 py-3 text-[15px] leading-6 text-[#2B2118]">
      <p className="font-bold">{title}</p>
      <p className="mt-1">
        {children}{" "}
        <Link href="/fonti" className="font-semibold text-primary underline underline-offset-4">Fonti e licenza</Link>
      </p>
    </div>
  );
}
