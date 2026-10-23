"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { FOOT_LINKS, visibleNavItems } from "@/components/nav-items";

const NONE: readonly string[] = [];

/**
 * Computer (≥1024 px): the five places in a fixed column on the left, instead of the bottom bar
 * (components/bottom-nav.tsx, same items). Not in the admin area, like the bar.
 */
export function SideNav({ hidden = NONE, admin: adminView = false }: { hidden?: readonly string[]; admin?: boolean }) {
  const pathname = usePathname();
  const items = useMemo(() => visibleNavItems(hidden, adminView), [hidden, adminView]);
  if (pathname.startsWith("/admin")) return null;
  return (
    <nav
      aria-label="Navigazione laterale"
      data-side-nav=""
      className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-border bg-[#EDE3CC] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pt-[env(safe-area-inset-top,0px)] lg:flex"
    >
      <Link href="/" className="mx-4 mt-6 mb-6 rounded-md px-2 font-serif text-[26px] font-semibold leading-tight text-primary focus-visible:outline-2 focus-visible:outline-primary">
        Il Grimorio<span className="text-amber">.App</span>
      </Link>
      <ul className="flex flex-col gap-1 px-3">
        {items.map(({ href, label, Icon, match, section }) => {
          const active = match(pathname);
          const off = section !== undefined && hidden.includes(section);
          return (
            <li key={href}>
              <Link
                href={href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={`flex h-[46px] items-center gap-3 rounded-[10px] px-3 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-elevated"}`}
              >
                <Icon size={20} strokeWidth={1.75} aria-hidden />
                <span className="min-w-0 flex-1">{label}</span>
                {off && <span className="rounded-[6px] bg-[#2B2118] px-1.5 text-[10px] font-bold leading-4 text-amber">Nascosta</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      <ul className="mt-auto flex flex-col px-5 pb-5 pt-6 text-[13px] text-muted">
        {FOOT_LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} prefetch={false} className="inline-flex min-h-11 items-center rounded-sm hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">{label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
