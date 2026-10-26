"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useIntentPrefetch } from "@/components/use-intent-prefetch";

/**
 * A link whose page is prepared on the first touch or hover instead of as soon as it shows on screen: the hub
 * pages (Compendio, Equipaggiamento) no longer download every section while the visitor only looks at them.
 */
export function IntentLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const prefetch = useIntentPrefetch(href);
  return <Link href={href} prefetch={false} onTouchStart={prefetch} onMouseEnter={prefetch} className={className}>{children}</Link>;
}
