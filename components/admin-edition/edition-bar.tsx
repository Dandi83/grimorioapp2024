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

/** «2024 · 2014» at the top of every admin page, with the band of the edition being edited (or «Comune alle due edizioni»). */
export function AdminEditionBar({ edition: initial }: { edition: AdminEdition }) {
  const pathname = usePathname() ?? "/admin";
  const { edition, choose, pending } = useAdminEditionSwitch(initial);
  const common = isCommonAdminPath(pathname);
  const band = EDITION_BAND[edition];
  return (
    <>
      <div role="group" aria-label="Edizione dell’area riservata" className="mx-4 mt-3 flex gap-1 rounded-xl bg-elevated p-1">
        {ADMIN_EDITIONS.map(value => (
          <button key={value} type="button" aria-pressed={value === edition} disabled={pending} onClick={() => choose(value)}
            // The chosen edition in its own colour, the same as the band (bordeaux 2024, blue 2014).
            style={value === edition ? { background: EDITION_BAND[value].background, color: EDITION_BAND[value].text } : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-[9px] font-bold tabular-nums ${value === edition ? "" : "text-muted"}`}>
            {value}
          </button>
        ))}
      </div>
      {common ? (
        <p data-testid="admin-edition-common" className="mx-auto mt-2 w-full max-w-2xl px-4">
          <span className="block rounded-[10px] border border-border bg-card px-3 py-2 text-center text-sm font-semibold text-muted">Comune alle due edizioni</span>
        </p>
      ) : (
        // A sibling of the page content: it stays visible at the top while the page scrolls.
        <div className="sticky top-0 z-20 mx-auto w-full max-w-2xl bg-background px-4 pb-1 pt-2">
          <p data-testid="admin-edition-band" className="rounded-[10px] px-3 py-2 text-center text-sm font-bold" style={{ background: band.background, color: band.text }}>
            {band.label}
          </p>
        </div>
      )}
    </>
  );
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
