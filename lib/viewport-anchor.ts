/**
 * The bottom bar on iPhone (PROMPT 23). On iOS 26, in the app installed on the Home screen above all, the visible part of
 * the page (visual viewport) can stay shifted from the layout viewport the fixed elements are placed in (after the
 * keyboard closes, while the page height changes during a long scroll): a bar at «bottom: 0» then sits below the
 * visible area and slides out of the screen. The gap is measured, not guessed: the bar is moved by the distance
 * between the bottom of the layout viewport and the bottom of what is visible; 0 when the two agree (every other
 * browser, and iPhone when the bug does not show). With the keyboard open the bar stays where it is today.
 */
export interface ViewportState {
  /** window.innerHeight: the layout viewport. */
  layoutHeight: number;
  /** visualViewport.height and offsetTop: what is visible. */
  visualHeight: number;
  visualTop: number;
  /** A text field has the focus (the keyboard is open): today's behaviour, no move. */
  editing: boolean;
}

/** The vertical move of the bar in px (negative: up), rounded; 0 when nothing is shifted or a field is being edited. */
export function bottomBarShift({ layoutHeight, visualHeight, visualTop, editing }: ViewportState): number {
  if (editing || !(layoutHeight > 0) || !(visualHeight > 0)) return 0;
  const shift = Math.round(visualTop + visualHeight - layoutHeight);
  // Pinch-zoom makes the visible part smaller on purpose: the bar stays put, as in every browser.
  if (visualHeight < layoutHeight * 0.6) return 0;
  return Math.abs(shift) < 1 ? 0 : shift;
}

const TEXT_INPUT = /^(?:text|search|email|url|tel|password|number)$/;

/** Whether the focused element opens the keyboard. */
export function editingElement(element: Element | null): boolean {
  if (!element) return false;
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return true;
  if (element instanceof HTMLInputElement) return TEXT_INPUT.test(element.type || "text");
  return element instanceof HTMLElement && element.isContentEditable;
}
