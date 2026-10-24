// Leaving an editor opened by «Modifica» on a public page: the editor never stays in the history of the
// phone. Before, «Torna alla scheda» (or X, or a save) opened the card again as a new step, so the history
// read card → editor → card and «indietro» on the card opened the editor again, in a loop. Browser only.

import { savePageContext } from "@/components/navigation-memory";

const OPENED = "grimorio:modifica-da";
const REFRESH = "grimorio:scheda-da-aggiornare";
/** The mark on the editor's own step of the history: the step before it is this page. */
const STATE_KEY = "grimorioModificaDa";
/** The same mark for this tab: a save may rewrite the state of the step (the router's own data). */
const STEP = "grimorio:passo-editor";
const here = () => `${window.location.pathname}${window.location.search}`;

/** «Modifica» or a pencil, just before the editor opens: the page it was opened from (path and query). */
export function noteEditorOpened(from: string) {
  // The card may come back as a new document: its back button keeps knowing where the card was opened from.
  savePageContext();
  try { window.sessionStorage.setItem(OPENED, JSON.stringify({ from, at: Date.now() })); } catch { /* no storage: the editor replaces its step */ }
}

/**
 * On the editor page: when it was opened from `back` a moment ago, the step before it in the history is
 * that page; the mark is kept on the editor's step (it survives a reload of the editor).
 */
export function adoptEditorStep(back: string) {
  try {
    const raw = window.sessionStorage.getItem(OPENED);
    window.sessionStorage.removeItem(OPENED);
    const opened = raw ? JSON.parse(raw) as { from?: string; at?: number } : null;
    if (opened?.from === back && Date.now() - (opened.at ?? 0) < 10 * 60_000 && window.history.length > 1) {
      window.history.replaceState({ ...(window.history.state ?? {}), [STATE_KEY]: back }, "");
      window.sessionStorage.setItem(STEP, JSON.stringify({ at: here(), back }));
    }
  } catch { /* no storage: the editor replaces its step */ }
}

/**
 * Closing, cancelling, «Torna alla scheda», or after a save: back in the history to the page it came from;
 * opened from a direct address, the editor's step becomes that page (replaced, no new step). After a save the
 * page shown again by «indietro» is loaded fresh (refreshSavedPage).
 */
export function leaveEditor(back: string, saved = false) {
  if (saved) {
    try { window.sessionStorage.setItem(REFRESH, back); } catch { /* the page is loaded from the server anyway */ }
  }
  let marked = (window.history.state as Record<string, unknown> | null)?.[STATE_KEY] === back;
  try {
    const step = JSON.parse(window.sessionStorage.getItem(STEP) || "null") as { at?: string; back?: string } | null;
    marked ||= step?.at === here() && step.back === back;
    window.sessionStorage.removeItem(STEP);
  } catch { /* no storage: the state of the step decides */ }
  if (marked) window.history.back();
  else window.location.replace(back);
}

/**
 * On every page: the card a save went back to, shown again from the browser's memory of the page (iPhone
 * «indietro»), is loaded again so it shows the saved data; a page loaded from the server is already fresh.
 */
export function refreshSavedPage(restored: boolean) {
  try {
    const path = window.sessionStorage.getItem(REFRESH);
    if (!path || path !== `${window.location.pathname}${window.location.search}`) return;
    window.sessionStorage.removeItem(REFRESH);
    if (restored) window.location.reload();
  } catch { /* no storage */ }
}
