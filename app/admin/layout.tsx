import type { ReactNode } from "react";

import { AdminSideNav } from "@/components/admin-shell/admin-side-nav";
import { AdminTopBar } from "@/components/admin-shell/admin-top-bar";
import { dueChecks } from "@/lib/admin-checks";
import { isAdmin } from "@/lib/admin-auth";
import { adminEdition } from "@/lib/admin-edition-server";
import { countNewFeedback } from "@/lib/feedback";
import { countProposalsToReview } from "@/lib/homebrew";

/**
 * Every page of the reserved area (after the login: the login page has none of it): the bar with the edition pill
 * and the bell, and on a computer the side menu. Never cached: the pages under it are all dynamic.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await isAdmin())) return children;
  const [edition, reports, proposals, due] = await Promise.all([
    adminEdition(), countNewFeedback().catch(() => 0), countProposalsToReview().catch(() => 0), dueChecks().catch(() => []),
  ]);
  const unread = reports + proposals;
  return (
    <div className="flex min-h-dvh bg-[#F6EFDF] text-[#2B2118]">
      <AdminSideNav due={due.length} unread={unread} />
      <div className="min-w-0 flex-1">
        <AdminTopBar edition={edition} unread={unread} />
        {children}
      </div>
    </div>
  );
}
