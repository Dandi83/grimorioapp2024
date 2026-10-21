"use client";

import { useEffect, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";

import type { SearchPanelProps } from "@/components/search/search-panel";
import styles from "./home-search.module.css";

let loading: Promise<ComponentType<SearchPanelProps>> | undefined;
// The panel code arrives after the Home (idle time) or at the first tap: the Home stays light.
const loadPanel = () => (loading ??= import("@/components/search/search-panel").then(module => module.SearchPanel));

/**
 * Field «Cerca in tutto il Grimorio…» of the Home. The open panel lives in the address (?cerca=…),
 * so "back" from a result reopens it with the text still written.
 */
export function HomeSearch() {
  const [Panel, setPanel] = useState<ComponentType<SearchPanelProps>>();
  const [open, setOpen] = useState<{ query: string; section?: string } | null>(null);

  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search);
      const query = params.get("cerca");
      if (query === null) { setOpen(null); return; }
      loadPanel().then(component => { setPanel(() => component); setOpen({ query, section: params.get("sezione") ?? undefined }); });
    };
    read();
    window.addEventListener("popstate", read);
    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 1500));
    idle(() => { loadPanel().then(component => setPanel(() => component)).catch(() => undefined); });
    return () => window.removeEventListener("popstate", read);
  }, []);

  const show = (query: string) => {
    const url = `/?cerca=${encodeURIComponent(query)}`;
    window.history.pushState({ ...window.history.state, grimorioSearch: true }, "", url);
    if (Panel) setOpen({ query });
    else loadPanel().then(component => { setPanel(() => component); setOpen({ query }); });
  };

  const close = () => {
    setOpen(null);
    if (window.history.state?.grimorioSearch) window.history.back();
    else window.history.replaceState(window.history.state, "", "/");
  };

  return (
    <div className={styles.search}>
      <button type="button" className={styles.field} onClick={() => show("")} aria-haspopup="dialog">
        <Search size={22} strokeWidth={2.2} aria-hidden="true" className={styles.lens} />
        <span>Cerca in tutto il Grimorio…</span>
      </button>
      {/* On the body: the picture of the Home is its own stacking context, under the header. */}
      {open && Panel && createPortal(<Panel initialQuery={open.query} initialSection={open.section} onClose={close} />, document.body)}
    </div>
  );
}
