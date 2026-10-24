"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setAdminEditionAction } from "@/app/actions/admin-edition";
import { ADMIN_EDITIONS, EDITION_BAND, isCommonAdminPath, type AdminEdition } from "@/lib/admin-edition";

/** Hook shared by the switch and the «Passa all'edizione …» buttons: saves the choice and reloads the page data. */
export function useAdminEditionSwitch(initial: AdminEdition) {
  const router = useRouter();
  const [edition, setEdition] = useState(initial);
  const [pending, startTransition] = useTransition();
  const choose = (value: AdminEdition) => {
    if (value === edition) return;
    setEdition(value);
    startTransition(async () => {
      try {
        const result = await setAdminEditionAction(value);
        if (result.ok) router.refresh();
        else setEdition(initial);
      } catch {
        setEdition(initial);
      }
    });
  };
  return { edition, choose, pending };
}

/**
 * The edition being edited, one control for the whole admin area: two halves at full width. The active
 * one is full in its colour and says «Stai modificando il 2014»; the other, light, says only «2024».
 * It stays at the top while the page scrolls, on its own background with a small margin under it, so
 * the content passes under it cleanly.
 */
export function AdminEditionSwitch({ edition: initial, className = "" }: { edition: AdminEdition; className?: string }) {
  const { edition, choose, pending } = useAdminEditionSwitch(initial);
  return (
    <div className={`sticky top-0 z-20 bg-background pb-3 pt-2 ${className}`}>
      <div role="group" aria-label="Edizione dell’area riservata" className="flex overflow-hidden rounded-[12px] border-[1.5px] border-border bg-card">
        {ADMIN_EDITIONS.map(value => {
          const active = value === edition;
          return (
            <button key={value} type="button" aria-pressed={active} disabled={pending} onClick={() => choose(value)}
              data-testid={active ? "admin-edition-band" : undefined}
              style={active ? { background: EDITION_BAND[value].background, color: EDITION_BAND[value].text } : undefined}
              className={`flex min-h-12 min-w-0 items-center justify-center px-3 text-[15px] font-bold tabular-nums focus-visible:outline-[3px] focus-visible:-outline-offset-[3px] focus-visible:outline-amber ${active ? "flex-[1.6]" : "flex-1 text-muted"}`}>
              <span className="truncate">{active ? EDITION_BAND[value].label : value}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * At the top of every admin page (after the login): the edition control, or «Comune alle due edizioni»
 * on the pages shared by both. The Home of the admin area draws the control under its title.
 */
export function AdminEditionBar({ edition }: { edition: AdminEdition }) {
  const pathname = usePathname() ?? "/admin";
  if (pathname === "/admin") return null;
  if (isCommonAdminPath(pathname)) {
    return (
      <p data-testid="admin-edition-common" className="mx-auto mt-3 w-full max-w-2xl px-4 lg:max-w-[1200px]">
        <span className="block rounded-[10px] border border-border bg-card px-3 py-2 text-center text-sm font-semibold text-muted">Comune alle due edizioni</span>
      </p>
    );
  }
  return <AdminEditionSwitch edition={edition} className="mx-auto w-full max-w-2xl px-4 lg:max-w-[1200px]" />;
}

/** A card or a link of the other edition: says so and offers to switch. */
export function OtherEditionNotice({ current, target, message }: { current: AdminEdition; target: AdminEdition; message: string }) {
  const { choose, pending } = useAdminEditionSwitch(current);
  return (
    <div role="note" className="flex flex-col gap-2 rounded-[14px] border-[1.5px] p-3.5 text-[15px]" style={{ borderColor: EDITION_BAND[target].background }}>
      <p>{message}</p>
      <button type="button" disabled={pending} onClick={() => choose(target)}
        className="inline-flex min-h-11 items-center self-start rounded-[22px] px-4 text-sm font-bold disabled:opacity-60"
        style={{ background: EDITION_BAND[target].background, color: EDITION_BAND[target].text }}>
        Passa all’edizione {target}
      </button>
    </div>
  );
}
