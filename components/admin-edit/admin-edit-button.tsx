"use client";

import { Pencil } from "lucide-react";

import { useAdminSession } from "@/components/admin-edit/admin-session";
import { adminEditHref, type AdminEditTarget } from "@/lib/admin-edit-link";

/**
 * The editor of the card, with this page (path and query) to come back to. Read again on the tap: a page
 * may change its query (?edizione) without being drawn again. Only in the browser: the buttons are
 * drawn after the session check, never on the server.
 */
function editHref(target: AdminEditTarget): string {
  return adminEditHref(target, `${window.location.pathname}${window.location.search}`);
}

/**
 * «Modifica» on a public card, for the administrator only (drawn in the browser after the server checked
 * the session: never in the cached pages). Phones and tablets: a round bordeaux button at the bottom right,
 * above the navigation bar. Computers: next to the title, where the page places it (desktop classes).
 * A full load of the editor: the admin area always starts from the server.
 */
export function AdminEditButton({ target, desktop = "lg:static lg:ml-3 lg:float-right" }: { target: AdminEditTarget; desktop?: string }) {
  const admin = useAdminSession();
  if (!admin) return null;
  return (
    <a href={editHref(target)} data-admin-edit="" onClick={event => { event.preventDefault(); window.location.assign(editHref(target)); }}
      className={`fixed bottom-[calc(92px+env(safe-area-inset-bottom,0px))] right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 text-[16px] font-bold text-white shadow-[0_4px_14px_rgb(43_33_24_/_28%)] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber lg:z-auto lg:min-h-11 lg:px-4 lg:text-[15px] lg:shadow-[0_2px_8px_rgb(43_33_24_/_18%)] ${desktop}`}>
      <Pencil size={18} strokeWidth={2.4} aria-hidden="true" />
      Modifica
    </a>
  );
}

/** A small pencil next to the name of a row of a list without its own editor page (administrator only). */
export function AdminEditPencil({ target, name }: { target: AdminEditTarget; name: string }) {
  const admin = useAdminSession();
  if (!admin) return null;
  return (
    <a href={editHref(target)} data-admin-edit="" aria-label={`Modifica ${name}`} title={`Modifica ${name}`}
      onClick={event => { event.preventDefault(); event.stopPropagation(); window.location.assign(editHref(target)); }}
      className="relative z-10 ml-2 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary align-middle text-white shadow-[0_1px_4px_rgb(43_33_24_/_25%)] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber">
      <Pencil size={16} strokeWidth={2.4} aria-hidden="true" />
    </a>
  );
}
