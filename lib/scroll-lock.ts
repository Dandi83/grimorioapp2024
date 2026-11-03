/**
 * PROMPT 57 (A1): the page under a panel (search, edition sheet, welcome screen) must not scroll, on iPhone too.
 * `overflow: hidden` on the body is ignored by iOS Safari for the page itself; the body fixed at the current position
 * (top: -scrollY) works everywhere and keeps the view where it was. Unlocking puts the position back exactly.
 * Nested locks (a sheet over the search) release only when the last one goes.
 */
let locks = 0;
let saved: { y: number; position: string; top: string; left: string; right: string; width: string; overflow: string } | null = null;

export function lockScroll(): () => void {
  if (typeof document === "undefined") return () => undefined;
  if (locks++ === 0) {
    const body = document.body;
    const y = window.scrollY;
    saved = { y, position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width, overflow: body.style.overflow };
    body.style.position = "fixed";
    body.style.top = y ? `-${y}px` : "0px";
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks > 0 || !saved) return;
    const body = document.body;
    body.style.position = saved.position;
    body.style.top = saved.top;
    body.style.left = saved.left;
    body.style.right = saved.right;
    body.style.width = saved.width;
    body.style.overflow = saved.overflow;
    const { y } = saved;
    saved = null;
    try { window.scrollTo(0, y); } catch { /* a browser without it: nothing to put back */ }
  };
}

/** For the tests: how many panels hold the page. */
export const scrollLocks = () => locks;
