"use client";

import { useEffect, useRef } from "react";

import type { Edition } from "@/lib/public-sections";

/**
 * A catalog list follows the edition it is asked to show (the address, else «la tua edizione») without
 * being rebuilt: its search, page and open panels stay. A change while the page is in use starts again
 * without filters (types and sizes differ between editions); the first reading of the device after
 * loading keeps the filters of the address.
 */
export function useFollowEdition(target: Edition | undefined, ready: boolean, show: (edition: Edition) => void, resetFilters: () => void) {
  const last = useRef<{ target: Edition | undefined; ready: boolean }>({ target, ready });
  const actions = useRef({ show, resetFilters });
  useEffect(() => { actions.current = { show, resetFilters }; });
  useEffect(() => {
    const before = last.current;
    last.current = { target, ready };
    if (target === undefined || target === before.target) return;
    actions.current.show(target);
    if (before.ready) actions.current.resetFilters();
  }, [target, ready]);
}
