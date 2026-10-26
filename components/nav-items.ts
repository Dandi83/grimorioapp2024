import { BookOpen, Home, ScrollText, Skull, Star } from "lucide-react";
import type { ComponentType } from "react";

import type { PublicSectionKey } from "@/lib/public-sections";

/**
 * The five places of the app, shared by the bottom bar (phone, tablet) and the side column (computer):
 * a section hidden from /admin/sezioni leaves both, and the administrator sees it labelled «Nascosta».
 */
export interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  match: (path: string) => boolean;
  /** The public section of the item (lib/public-sections.ts): a hidden one leaves the navigation. */
  section?: PublicSectionKey;
}

/**
 * The Home: «/» in the browser, «/index» while Vercel prerenders it. Both must give the same markup, or React
 * throws away the server HTML of the Home and draws it again (hydration error #418).
 */
export const isHomePath = (path: string) => path === "/" || path === "/index";

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", Icon: Home, match: isHomePath },
  {
    href: "/grimorio",
    label: "Incantesimi",
    Icon: BookOpen,
    match: (p) => p.startsWith("/grimorio") || p.startsWith("/spell"),
    section: "incantesimi",
  },
  {
    href: "/bestiario",
    label: "Bestiario",
    Icon: Skull,
    match: (p) => p.startsWith("/bestiario") || p.startsWith("/mostro"),
    section: "bestiario",
  },
  {
    href: "/compendio",
    label: "Compendio",
    Icon: ScrollText,
    match: (p) => p.startsWith("/compendio") || p.startsWith("/equipaggiamento") || p.startsWith("/avanzamento") || p.startsWith("/oggetti-magici") || p.startsWith("/classi"),
  },
  {
    href: "/preferiti",
    label: "Preferiti",
    Icon: Star,
    match: (p) => p.startsWith("/preferiti"),
  },
];

/** The links at the bottom of the side column (computers): the legal pages and the reserved area (with the lock). */
export const FOOT_LINKS: { href: string; label: string; lock?: true }[] = [
  { href: "/info", label: "Info e note legali" },
  { href: "/admin", label: "Area riservata", lock: true },
];

/**
 * The items the visitor sees: hidden sections out, unless the administrator is looking; a section «In arrivo»
 * (soon) stays, attenuated, and its page says it is coming.
 */
export function visibleNavItems(hidden: readonly string[], admin: boolean, soon: readonly string[] = []): NavItem[] {
  return NAV_ITEMS.filter(item => admin || !item.section || !hidden.includes(item.section) || soon.includes(item.section));
}
