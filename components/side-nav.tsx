"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

import { FOOT_LINKS, visibleNavItems } from "@/components/nav-items";
import { soonHref } from "@/lib/public-sections";
import { EditionPill } from "@/components/edition/edition-pill";
import { Lock } from "lucide-react";
import { CupIcon } from "@/components/support/cup-icon";
import { SupportLink } from "@/components/support/support-link";

const NONE: readonly string[] = [];

/**
 * Computer (≥1024 px): the five places in a fixed column on the left, instead of the bottom bar
 * (components/bottom-nav.tsx, same items). Not in the admin area, like the bar.
 */
export function SideNav({ hidden = NONE, admin: adminView = false, soon = NONE, support = false }: { hidden?: readonly string[]; admin?: boolean; soon?: readonly string[]; support?: boolean }) {
  const pathname = usePathname();
  const items = useMemo(() => visibleNavItems(hidden, adminView, soon), [hidden, adminView, soon]);
  // Browsers without :has() (app/globals.css): the frame of the pages is marked while the column is there.
  const markFrame = useCallback((nav: HTMLElement | null) => {
    const frame = nav?.parentElement;
    if (!frame) return;
    frame.setAttribute("data-with-side-nav", "");
    return () => frame.removeAttribute("data-with-side-nav");
  }, []);
  if (pathname.startsWith("/admin")) return null;
  return (
    <nav
      ref={markFrame}
      aria-label="Navigazione laterale"
      data-side-nav=""
      className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-border bg-[#EDE3CC] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pt-[env(safe-area-inset-top,0px)] lg:flex"
    >
      <Link href="/" className="mx-4 mt-6 mb-3 rounded-md px-2 font-serif text-[26px] font-semibold leading-tight text-primary focus-visible:outline-2 focus-visible:outline-primary">
        Il Grimorio<span className="text-amber">.App</span>
      </Link>
      {/* «La tua edizione», for the whole app. */}
      <EditionPill place="side" className="mx-6 mb-5" />
      <ul className="flex flex-col gap-1 px-3">
        {items.map(({ href, label, Icon, match, section }) => {
          const active = match(pathname);
          const coming = section !== undefined && soon.includes(section);
          const off = section !== undefined && hidden.includes(section) && !coming;
          return (
            <li key={href} className={coming ? "opacity-60" : undefined} data-soon={coming ? "" : undefined}>
              <Link
                href={coming && !adminView && section ? soonHref(section) : href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={`flex h-[46px] items-center gap-3 rounded-[10px] px-3 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-elevated"}`}
              >
                <Icon size={20} strokeWidth={1.75} aria-hidden />
                <span className="min-w-0 flex-1">{label}</span>
                {off && <span className="rounded-[6px] bg-[#2B2118] px-1.5 text-[10px] font-bold leading-4 text-amber">Nascosta</span>}
                {coming && <span className="rounded-[6px] bg-[#E0A21A] px-1.5 text-[10px] font-bold leading-4 text-[#2B2118]">In arrivo</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      <ul className="mt-auto flex flex-col px-5 pb-5 pt-6 text-[13px] text-muted">
        {/* «Sostieni il Grimorio» near the legal pages, when the Ko-fi address is set (lib/support.ts). */}
        {support && (
          <li>
            <SupportLink enabled from="colonna" className="inline-flex min-h-11 items-center gap-1.5 rounded-sm font-bold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">
              <CupIcon size={16} />Sostieni il Grimorio
            </SupportLink>
          </li>
        )}
        {FOOT_LINKS.map(({ href, label, lock }) => (
          <li key={href}>
            <Link href={href} prefetch={false} className="inline-flex min-h-11 items-center gap-1.5 rounded-sm hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">
              {lock && <Lock size={16} strokeWidth={2} aria-hidden="true" />}{label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
