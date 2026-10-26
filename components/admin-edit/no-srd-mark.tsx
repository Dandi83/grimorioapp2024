"use client";

import { useEffect, useState } from "react";

import { useAdminSession } from "@/components/admin-edit/admin-session";

type NoSrdKind = "incantesimi" | "mostri";

/**
 * The NO SRD cards of a list, for the administrator only: like «Modifica», asked after the session check
 * (/api/admin/sessione) from /api/admin/no-srd, never part of the page, its offline copy or the catalog data.
 * Visitors never ask; after «Esci» the set is gone and the asterisks with it.
 */
export function useNoSrdIds(kind: NoSrdKind): ReadonlySet<string> | null {
  const admin = useAdminSession();
  const [ids, setIds] = useState<ReadonlySet<string> | null>(null);
  useEffect(() => {
    if (!admin) return;
    let live = true;
    fetch("/api/admin/no-srd", { cache: "no-store", credentials: "same-origin" })
      .then(response => (response.ok ? response.json() as Promise<Record<NoSrdKind, string[]>> : null))
      .then(data => { if (live) setIds(data ? new Set(data[kind]) : null); })
      .catch(() => { if (live) setIds(null); });
    return () => { live = false; };
  }, [admin, kind]);
  // Not (or no longer) the administrator: nothing, whatever was loaded before «Esci».
  return admin ? ids : null;
}

/** «*» after the name in the lists: small, bordeaux, on the line of the name (the row keeps its height). */
export function NoSrdMark() {
  return (
    <span role="img" aria-label="NO SRD (visibile solo a te)" title="NO SRD (visibile solo a te)" data-no-srd-mark=""
      className="ml-0.5 inline-block align-top text-[0.7em] font-bold leading-none text-[#7A1F2B]">*</span>
  );
}
