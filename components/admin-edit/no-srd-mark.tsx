"use client";

import { useEffect, useMemo, useState } from "react";

import { useAdminSession } from "@/components/admin-edit/admin-session";

type NoSrdKind = "incantesimi" | "mostri";
type NoSrdData = Record<NoSrdKind, string[]>;

/**
 * The NO SRD cards of a list, for the administrator only: like «Modifica», asked after the session check
 * (/api/admin/sessione) from /api/admin/no-srd, never part of the page, its offline copy or the catalog data.
 * Visitors never ask; after «Esci» the data are gone, and the asterisks with them.
 */
function useNoSrdData(): NoSrdData | null {
  const admin = useAdminSession();
  const [data, setData] = useState<NoSrdData | null>(null);
  useEffect(() => {
    if (!admin) return;
    let live = true;
    fetch("/api/admin/no-srd", { cache: "no-store", credentials: "same-origin" })
      .then(response => (response.ok ? response.json() as Promise<NoSrdData> : null))
      .then(value => { if (live) setData(value); })
      .catch(() => { if (live) setData(null); });
    return () => { live = false; };
  }, [admin]);
  // Not (or no longer) the administrator: nothing, whatever was loaded before «Esci».
  return admin ? data : null;
}

/** The NO SRD ids of a list: the «*» after the names; null for visitors. */
export function useNoSrdIds(kind: NoSrdKind): ReadonlySet<string> | null {
  const data = useNoSrdData();
  return useMemo(() => (data ? new Set(data[kind]) : null), [data, kind]);
}

/** «*» after the name in the lists: small, bordeaux, on the line of the name (the row keeps its height). */
export function NoSrdMark() {
  return (
    <span role="img" aria-label="NO SRD (visibile solo a te)" title="NO SRD (visibile solo a te)" data-no-srd-mark=""
      className="ml-0.5 inline-block align-top text-[0.7em] font-bold leading-none text-[#7A1F2B]">*</span>
  );
}
