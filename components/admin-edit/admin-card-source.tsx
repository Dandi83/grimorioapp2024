"use client";

import { usePathname } from "next/navigation";

import { useAdminSession } from "@/components/admin-edit/admin-session";
import { ADMIN_ONLY_SOURCES, SourcePill, type AdminOnlySource } from "@/components/card-source-pill";

/**
 * «Aggiunta da te» and «Sintesi originale» on a card: like «Modifica», drawn in the browser for the administrator
 * once /api/admin/sessione confirms the session, never in the page cached for everyone; always in the previews of
 * the reserved area. «NO SRD» next to it is for everyone (components/spell-sheet.tsx).
 */
export function AdminCardSource({ code }: { code: AdminOnlySource }) {
  const admin = useAdminSession();
  const reserved = usePathname()?.startsWith("/admin") ?? false;
  if (!admin && !reserved) return null;
  return <SourcePill source={ADMIN_ONLY_SOURCES[code]} />;
}
