"use client";

import { useEffect, useMemo, useState } from "react";

import { useAdminSession } from "@/components/admin-edit/admin-session";
import type { ProvenanceIds } from "@/lib/provenance";

type NoSrdKind = "incantesimi" | "mostri";
type NoSrdData = Record<NoSrdKind, string[]> & { sintesi?: Record<NoSrdKind, string[]> };

/**
 * The NO SRD cards of a list, for the administrator only: like «Modifica», asked after the session check
 * (/api/admin/sessione) from /api/admin/no-srd, never part of the page, its offline copy or the catalog data.
 * Visitors never ask; after «Esci» the data are gone, and the asterisks and the «Provenienza» filter with them.
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

export interface NoSrdView { ids: ReadonlySet<string>; provenance: ProvenanceIds }

/** The NO SRD ids of a list (the «*») and the split for the «Provenienza» filter; null for visitors. */
export function useNoSrd(kind: NoSrdKind): NoSrdView | null {
  const data = useNoSrdData();
  return useMemo(() => {
    if (!data) return null;
    const ids = new Set(data[kind]);
    const sintesi = new Set(data.sintesi?.[kind] ?? []);
    return { ids, provenance: { sintesi, aggiunte: new Set([...ids].filter(id => !sintesi.has(id))) } };
  }, [data, kind]);
}

/** Only the ids (the «*» after the names). */
export function useNoSrdIds(kind: NoSrdKind): ReadonlySet<string> | null {
  return useNoSrd(kind)?.ids ?? null;
}

/** «*» after the name in the lists: small, bordeaux, on the line of the name (the row keeps its height). */
export function NoSrdMark() {
  return (
    <span role="img" aria-label="NO SRD (visibile solo a te)" title="NO SRD (visibile solo a te)" data-no-srd-mark=""
      className="ml-0.5 inline-block align-top text-[0.7em] font-bold leading-none text-[#7A1F2B]">*</span>
  );
}
