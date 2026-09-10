"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Dices, Home, Skull, Star } from "lucide-react";
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
    label: "Grimorio",
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
  { href: "/dadi", label: "Dadi", Icon: Dices, match: (p) => p.startsWith("/dadi") },
];

export function BottomNav() {
  const pathname = usePathname();

  // L'area riservata non fa parte della navigazione pubblica.
  if (pathname.startsWith("/admin")) return null;

  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-2xl border-t border-border bg-card/95 backdrop-blur"
    >
      <ul className="flex items-stretch">
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 px-2 pb-6 pt-3 transition-colors"
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.4 : 2}
                  className={active ? "text-primary" : "text-muted"}
                />
                <span
                  className={`text-[11px] font-semibold tracking-wide ${
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
