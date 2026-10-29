/**
 * The bottom bar on iPhone (PROMPT 23, corrected by PROMPT 27). On iOS 26, in the app installed on the Home screen above
 * all, after the keyboard closes the visible part of the page (visual viewport) can stay above the bottom of the layout
 * viewport the fixed elements are placed in: the bar at «bottom: 0» then floats above the bottom of the screen. It is
 * measured only when the visible area changes size (the keyboard opening and closing), never while the page scrolls or
 * bounces, and the bar only ever goes down, to the bottom edge. The page itself does not bounce any more
 * (overscroll-behavior-y: none on html and body, app/globals.css).
 */
export interface ViewportState {
  /** window.innerHeight: the layout viewport. */
  layoutHeight: number;
  /** visualViewport.height and offsetTop: what is visible. */
  visualHeight: number;
  visualTop: number;
  /** A text field has the focus (the keyboard is open): today's behaviour, no move. */
  editing: boolean;
  /** window.scrollY and the largest scroll of the page: out of 0…max the page is bouncing, nothing is measured. */
  scrollY: number;
  maxScroll: number;
}

/**
 * The move of the bar in px, down only (0: in place), rounded; null while the page is bouncing (scrollY out of 0…max):
 * the bar keeps where it is.
 */
export function bottomBarShift({ layoutHeight, visualHeight, visualTop, editing, scrollY, maxScroll }: ViewportState): number | null {
  if (scrollY < 0 || scrollY > Math.max(0, maxScroll) + 1) return null;
  if (editing || !(layoutHeight > 0) || !(visualHeight > 0)) return 0;
  // Pinch-zoom makes the visible part smaller on purpose: the bar stays put, as in every browser.
  if (visualHeight < layoutHeight * 0.6) return 0;
  const shift = Math.round(visualTop + visualHeight - layoutHeight);
  return shift >= 1 ? shift : 0;
}

const TEXT_INPUT = /^(?:text|search|email|url|tel|password|number)$/;

/** Whether the focused element opens the keyboard. */
export function editingElement(element: Element | null): boolean {
  if (!element) return false;
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return true;
  if (element instanceof HTMLInputElement) return TEXT_INPUT.test(element.type || "text");
  return element instanceof HTMLElement && element.isContentEditable;
}
