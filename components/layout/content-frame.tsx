"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { CatalogSplit } from "@/components/layout/catalog-split";

/** Long reading pages (rules, terms): about 75 characters per line on a computer. */
const READING = /^\/(?:manuale\/|fonti$|privacy$|segnala$)/;

/**
 * The content area. Phone: the pages as they are (only lg: classes are added here). Computer: spells and
 * creatures as list + card side by side, the Home and the admin area full width, the other pages centred.
 */
export function ContentFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  if (/^\/(?:grimorio$|spell\/)/.test(pathname)) return <CatalogSplit kind="incantesimi">{children}</CatalogSplit>;
  if (/^\/(?:bestiario$|mostro\/)/.test(pathname)) return <CatalogSplit kind="bestiario">{children}</CatalogSplit>;
  // The character sheets keep their print layout (globals.css: main>div), the Home and the admin area their width.
  if (pathname === "/" || pathname.startsWith("/admin") || pathname.startsWith("/personaggi")) return <>{children}</>;
  return <div className={READING.test(pathname) ? "lg:mx-auto lg:max-w-[760px]" : "lg:mx-auto lg:max-w-[1040px]"}>{children}</div>;
}
