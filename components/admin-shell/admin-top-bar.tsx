"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

import { useAdminEditionSwitch } from "@/components/admin-edition/edition-bar";
import { ADMIN_EDITIONS, EDITION_BAND, isCommonAdminPath, type AdminEdition } from "@/lib/admin-edition";

/**
 * The 2024 | 2014 pill of the reserved area: the active half full in the colour of its edition (bordeaux 2024,
 * blue 2014), the other light. Saved for the whole area; the page data reload at once.
 */
export function AdminEditionPill({ edition: initial }: { edition: AdminEdition }) {
  const { edition, choose, pending } = useAdminEditionSwitch(initial);
  return (
    <div role="group" aria-label="Edizione dell’area riservata" className="inline-flex shrink-0 rounded-full border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] p-[3px]">
      {ADMIN_EDITIONS.map(value => {
        const active = value === edition;
        return (
          <button key={value} type="button" aria-pressed={active} disabled={pending} onClick={() => choose(value)}
            aria-label={active ? EDITION_BAND[value].label : `Passa al ${value}`}
            data-testid={active ? "admin-edition-band" : undefined}
            style={active ? { background: EDITION_BAND[value].background, color: EDITION_BAND[value].text } : undefined}
            className={`min-h-11 min-w-[64px] rounded-full px-4 text-[15px] font-bold tabular-nums focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-[#E0A21A] ${active ? "" : "text-[#5E4E3E]"}`}>
            {value}
          </button>
        );
      })}
    </div>
  );
}

/** The bell: the notifications page, with the number of unread ones. */
export function AdminBell({ unread }: { unread: number }) {
  return (
    <Link href="/admin/notifiche" prefetch={false} aria-label={unread ? `Notifiche · ${unread} ${unread === 1 ? "non letta" : "non lette"}` : "Notifiche"}
      data-admin-bell={unread} className="relative grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] text-[#2B2118] focus-visible:outline-[3px] focus-visible:outline-[#E0A21A]">
      <Bell size={21} strokeWidth={1.9} aria-hidden="true" />
      {unread > 0 && (
        <span aria-hidden="true" className="absolute -right-1 -top-1 grid min-w-[22px] place-items-center rounded-full bg-[#7A1F2B] px-1.5 text-[12px] font-bold leading-[22px] text-[#FFFBF0]">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

/**
 * At the top of every page of the reserved area (after the login): the edition pill, or «Comune alle due edizioni»
 * on the pages shared by both, and the bell on the right. It stays at the top while the page scrolls.
 */
export function AdminTopBar({ edition, unread }: { edition: AdminEdition; unread: number }) {
  const pathname = usePathname() ?? "/admin";
  return (
    <div className="sticky top-0 z-30 border-b border-[#DDCFAE]/70 bg-[#F6EFDF]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-2">
        {isCommonAdminPath(pathname) ? (
          <p data-testid="admin-edition-common" className="rounded-full border border-[#DDCFAE] bg-[#FFFBF0] px-3 py-2 text-[14px] font-semibold text-[#5E4E3E]">Comune alle due edizioni</p>
        ) : <AdminEditionPill key={edition} edition={edition} />}
        <AdminBell unread={unread} />
      </div>
    </div>
  );
}
