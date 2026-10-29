"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { notePathChange } from "@/components/navigation-memory";
import { visibleNavItems } from "@/components/nav-items";
import { soonHref } from "@/lib/public-sections";
import { bottomBarShift, editingElement } from "@/lib/viewport-anchor";

const NONE: readonly string[] = [];
/** Prepared while the phone is idle after the start: the two lists, the most opened sections. */
const WARM = ["/grimorio", "/bestiario"];

/**
 * hidden: sections hidden from /admin/sezioni; admin: the administrator still sees them, labelled «Nascosta»;
 * soon: sections «In arrivo», attenuated with their pill for everyone.
 */
export function BottomNav({ hidden = NONE, admin: adminView = false, soon = NONE }: { hidden?: readonly string[]; admin?: boolean; soon?: readonly string[] }) {
  const pathname = usePathname();
  const items = useMemo(() => visibleNavItems(hidden, adminView, soon), [hidden, adminView, soon]);
  const router = useRouter();
  const admin = pathname.startsWith("/admin");

  // Counts in-app page changes for the back button and remembers the pages (the first page starts the trail).
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    notePathChange(pathname);
  }, [pathname]);

  // The other places: prepared when the mouse reaches them or the keyboard focus does, well before the
  // click. Not on touch (a tap also gives the focus): the page is fetched by the tap itself (a prefetch started by the finger cannot finish
  // in time and the page would be downloaded twice).
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

  // iPhone (PROMPT 23): the bar follows the bottom of what is visible when iOS leaves the visible area shifted from the
  // one fixed elements are placed in (lib/viewport-anchor.ts); measured on every scroll and resize of the visible area.
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (admin || !viewport) return;
    let frame = 0;
    const place = () => {
      frame = 0;
      const shift = bottomBarShift({ layoutHeight: window.innerHeight, visualHeight: viewport.height, visualTop: viewport.offsetTop, editing: editingElement(document.activeElement) });
      if (bar.current) bar.current.style.transform = shift ? `translate3d(0, ${shift}px, 0)` : "";
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(place); };
    viewport.addEventListener("resize", schedule);
    viewport.addEventListener("scroll", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("focusin", schedule);
    window.addEventListener("focusout", schedule);
    schedule();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", schedule);
      viewport.removeEventListener("scroll", schedule);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("focusin", schedule);
      window.removeEventListener("focusout", schedule);
    };
  }, [admin]);

  // L'area riservata non fa parte della navigazione pubblica.
  if (admin) return null;

  return (
    <nav
      ref={bar}
      aria-label="Navigazione principale"
      data-bottom-nav=""
      className="fixed inset-x-0 bottom-0 z-50 mx-auto h-[calc(80px+env(safe-area-inset-bottom,0px))] w-full max-w-2xl border-t border-border bg-nav pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] md:max-w-[620px] lg:hidden"
    >
      <ul className="flex h-[80px] items-stretch">
        {items.map(({ href, label, Icon, match, section }) => {
          const active = match(pathname);
          const coming = section !== undefined && soon.includes(section);
          const off = section !== undefined && hidden.includes(section) && !coming;
          return (
            <li key={href} className={`flex-1 ${coming ? "opacity-60" : ""}`} data-soon={coming ? "" : undefined}>
              <Link
                href={coming && !adminView && section ? soonHref(section) : href}
                prefetch={false}
                onPointerEnter={event => { if (event.pointerType === "mouse") prepare(href); }}
                onFocus={event => { if (event.currentTarget.matches(":focus-visible")) prepare(href); }}
                aria-current={active ? "page" : undefined}
                className="relative flex h-full flex-col items-center justify-center gap-1.5 px-1 transition-colors"
              >
                {off && <span className="absolute left-1/2 top-1 -translate-x-1/2 rounded-[6px] bg-[#2B2118] px-1.5 text-[10px] font-bold leading-4 text-amber">Nascosta</span>}
                {coming && <span className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap rounded-[6px] bg-[#E0A21A] px-1.5 text-[10px] font-bold leading-4 text-[#2B2118]">In arrivo</span>}
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
