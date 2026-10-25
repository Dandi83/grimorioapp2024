"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { notePathChange } from "@/components/navigation-memory";
import { visibleNavItems } from "@/components/nav-items";

const NONE: readonly string[] = [];
/** Prepared while the phone is idle after the start: the two lists, the most opened sections. */
const WARM = ["/grimorio", "/bestiario"];

/** hidden: sections hidden from /admin/sezioni; admin: the administrator still sees them, labelled «Nascosta». */
export function BottomNav({ hidden = NONE, admin: adminView = false }: { hidden?: readonly string[]; admin?: boolean }) {
  const pathname = usePathname();
  const items = useMemo(() => visibleNavItems(hidden, adminView), [hidden, adminView]);
  const router = useRouter();
  const admin = pathname.startsWith("/admin");

  // Counts in-app page changes for the back button and remembers the pages (the first page starts the trail).
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    notePathChange(pathname);
  }, [pathname]);

  // The other places are prepared when the finger touches them (or the pointer reaches them), before the tap ends.
  const prepared = useRef(new Set<string>());
  const prepare = useCallback((href: string) => {
    if (prepared.current.has(href)) return;
    prepared.current.add(href);
    router.prefetch(href);
  }, [router]);

  useEffect(() => {
    if (admin) return;
    const warm = () => { for (const { href } of items) if (WARM.includes(href)) prepare(href); };
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(warm);
      return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(warm, 300);
    return () => window.clearTimeout(handle);
  }, [prepare, admin, items]);

  // L'area riservata non fa parte della navigazione pubblica.
  if (admin) return null;

  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto h-[calc(80px+env(safe-area-inset-bottom,0px))] w-full max-w-2xl border-t border-border bg-nav pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] md:max-w-[620px] lg:hidden"
    >
      <ul className="flex h-[80px] items-stretch">
        {items.map(({ href, label, Icon, match, section }) => {
          const active = match(pathname);
          const off = section !== undefined && hidden.includes(section);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                prefetch={false}
                onTouchStart={() => prepare(href)}
                onPointerEnter={() => prepare(href)}
                onFocus={() => prepare(href)}
                aria-current={active ? "page" : undefined}
                className="relative flex h-full flex-col items-center justify-center gap-1.5 px-1 transition-colors"
              >
                {off && <span className="absolute left-1/2 top-1 -translate-x-1/2 rounded-[6px] bg-[#2B2118] px-1.5 text-[10px] font-bold leading-4 text-amber">Nascosta</span>}
                <Icon
                  size={26}
                  strokeWidth={1.75}
                  className={active ? "text-primary" : "text-muted"}
                />
                <span
                  className={`text-[13px] font-semibold leading-[18px] ${
                    active ? "text-primary" : "text-muted"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
