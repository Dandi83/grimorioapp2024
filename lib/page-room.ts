/**
 * PROMPT 57 (M5): something at the end of the page goes away (the statistics bar's room, the question «Come ti trovi?»).
 * Taking its space at once while the page is scrolled to its end makes the content jump: the space goes only when the
 * reader is far enough from the end (nothing on screen moves), or when the page changes.
 */
export function releaseWhenAway(release: () => void, margin = 160): () => void {
  if (typeof window === "undefined") { release(); return () => undefined; }
  // A page that fits the screen cannot jump: released at once.
  const away = () => {
    const height = document.documentElement.scrollHeight;
    return height <= window.innerHeight || height - (window.scrollY + window.innerHeight) > margin;
  };
  if (away()) { release(); return () => undefined; }
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    window.removeEventListener("scroll", check);
    release();
  };
  const check = () => { if (away()) finish(); };
  window.addEventListener("scroll", check, { passive: true });
  // The caller flushes it when the page changes (the next page starts at its top anyway).
  return finish;
}
