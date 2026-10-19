"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BookOpen, Home, Skull, Star } from "lucide-react";
import type { ComponentType } from "react";

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  match: (path: string) => boolean;
}

const ITEMS: NavItem[] = [
  { href: "/", label: "Home", Icon: Home, match: (p) => p === "/" },
  {
    href: "/grimorio",
    label: "Incantesimi",
    Icon: BookOpen,
    match: (p) => p.startsWith("/grimorio") || p.startsWith("/spell"),
  },
  {
    href: "/bestiario",
    label: "Bestiario",
    Icon: Skull,
    match: (p) => p.startsWith("/bestiario") || p.startsWith("/mostro"),
  },
  {
    href: "/preferiti",
    label: "Preferiti",
    Icon: Star,
    match: (p) => p.startsWith("/preferiti"),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const admin = pathname.startsWith("/admin");

  useEffect(() => {
    if (admin) return;
    const warm = () => { for (const { href } of ITEMS) router.prefetch(href); };
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(warm);
      return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(warm, 300);
    return () => window.clearTimeout(handle);
  }, [router, admin]);

  // L'area riservata non fa parte della navigazione pubblica.
  if (admin) return null;

  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto h-[calc(88px+env(safe-area-inset-bottom,0px))] w-full max-w-2xl border-t border-border bg-card pb-[env(safe-area-inset-bottom,0px)]"
    >
      <ul className="flex h-[88px] items-stretch">
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className="flex h-full flex-col items-center justify-center gap-1.5 px-1 transition-colors"
              >
                <Icon
                  size={28}
                  strokeWidth={active ? 2.4 : 2}
                  className={active ? "text-primary" : "text-muted"}
                />
                <span
                  className={`text-[13px] font-semibold leading-[18px] tracking-wide ${
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
