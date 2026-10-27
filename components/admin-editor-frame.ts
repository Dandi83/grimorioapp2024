import { useEffect, useRef } from "react";

/** The editor as a dialog over the list of the admin area. */
const DIALOG = "fixed inset-0 m-auto max-h-[94dvh] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-border p-0 text-foreground shadow-2xl backdrop:bg-black/80";
/** The editor as the page itself («Modifica» on a public card): drawn by the server, nothing behind it, no opening animation. */
const PAGE = "static m-0 block h-auto w-full max-w-none rounded-2xl border border-border p-0 text-foreground";

/**
 * Shared by the editors of spells, creatures and homebrew. page: the editor is the page (an open <dialog>
 * in the server HTML, no list before it); otherwise a modal dialog over the list. Either way the focus
 * goes to the title (screen readers hear what opened), never to the first button: no ring without a
 * keyboard, and from the title Tab goes on to the buttons, where :focus-visible draws it.
 */
export function useEditorFrame(page = false) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!page) dialog.current?.showModal();
    // «Rinomina» of the lists (?campo=nome): the name field, ready to type; otherwise the title.
    const field = page && new URLSearchParams(window.location.search).get("campo") === "nome"
      ? (document.getElementById("nome_italiano") ?? document.getElementById("nome")) as HTMLInputElement | null : null;
    if (field) { field.focus(); field.select?.(); }
    else heading.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
  }, [page]);
  return {
    dialog,
    heading,
    frame: page ? PAGE : DIALOG,
    /** The header stays on top of the dialog while it scrolls; in the page it scrolls away (the edition switch is sticky). */
    header: page ? "" : "sticky top-0 z-10",
    /** Back to the top of the editor (the preview). */
    toTop: () => (page ? window : dialog.current)?.scrollTo({ top: 0 }),
  };
}
