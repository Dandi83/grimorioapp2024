"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

/** Prefetches a row's page once, on the first touch or hover. */
export function useIntentPrefetch(href: string) {
  const router = useRouter();
  const prefetched = useRef<string | null>(null);
  return () => {
    if (prefetched.current === href) return;
    prefetched.current = href;
    router.prefetch(href);
  };
}
