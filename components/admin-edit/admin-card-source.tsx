"use client";

import { usePathname } from "next/navigation";

import { useAdminSession } from "@/components/admin-edit/admin-session";
import { ADMIN_ONLY_SOURCES, SourcePill, type AdminOnlySource } from "@/components/card-source-pill";

/**
 * «Aggiunta da te» and «Sintesi originale» on a card: like «Modifica», drawn in the browser for the administrator
 * once /api/admin/sessione confirms the session, never in the page cached for everyone; always in the previews of
 * the reserved area. alone: no other label on the card, the row of labels comes with it.
 */
export function AdminCardSource({ code, alone = false }: { code: AdminOnlySource; alone?: boolean }) {
  const admin = useAdminSession();
  const reserved = usePathname()?.startsWith("/admin") ?? false;
  if (!admin && !reserved) return null;
  const pill = <SourcePill source={ADMIN_ONLY_SOURCES[code]} />;
  return alone ? <p className="mt-2 flex flex-wrap gap-1.5" data-card-labels="">{pill}</p> : pill;
}
