import type { ReactNode } from "react";

import { AdminSideNav } from "@/components/admin-shell/admin-side-nav";
import { AdminTopBar } from "@/components/admin-shell/admin-top-bar";
import { dueChecks } from "@/lib/admin-checks";
import { isAdmin } from "@/lib/admin-auth";
import { adminEdition } from "@/lib/admin-edition-server";
import { countNewFeedback } from "@/lib/feedback";
import { countProposalsToReview } from "@/lib/homebrew";
import { srdOnlyState } from "@/lib/srd-only";
import { romeTime } from "@/lib/srd-only-time";
import Link from "next/link";

/**
 * Every page of the reserved area (after the login: the login page has none of it): the bar with the edition pill
 * and the bell, and on a computer the side menu. Never cached: the pages under it are all dynamic.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await isAdmin())) return children;
  const [edition, reports, proposals, due, srdOnly] = await Promise.all([
    adminEdition(), countNewFeedback().catch(() => 0), countProposalsToReview().catch(() => 0), dueChecks().catch(() => []),
    srdOnlyState().catch(() => null),
  ]);
  const unread = reports + proposals;
  return (
    <div className="flex min-h-dvh bg-[#F6EFDF] text-[#2B2118]">
      <AdminSideNav due={due.length} unread={unread} />
      <div className="min-w-0 flex-1">
        {/* «Modalità solo SRD» on (PROMPT 39): a thin band on every page of the reserved area, never on the public ones. */}
        {srdOnly?.attiva && (
          <p data-srd-only-band="" className="bg-[#7A1F2B] px-4 py-1.5 text-center text-[13px] font-semibold leading-5 text-[#FFFBF0]">
            Modalità solo SRD attiva{srdOnly.dal ? ` dalle ${romeTime(srdOnly.dal)}` : ""} · {srdOnly.quanti.toLocaleString("it-IT")} {srdOnly.quanti === 1 ? "contenuto nascosto" : "contenuti nascosti"} ·{" "}
            <Link href="/admin#solo-srd" prefetch={false} className="underline underline-offset-2">Disattiva</Link>
          </p>
        )}
        <AdminTopBar edition={edition} unread={unread} />
        {children}
      </div>
    </div>
  );
}
