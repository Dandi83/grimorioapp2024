import { expect } from "./fixtures.mjs";

/**
 * PROMPT 56. iOS (app installed above all) can leave the visible area lower than the layout viewport after the keyboard
 * closes: the bar goes down to the bottom edge (PROMPT 23). The next scroll realigns the visible area, with a «scroll» of
 * the visual viewport and no «resize»: the bar must come back at once, else it stays off the screen (what Daniele saw on
 * 3 November: the bar «scivola fuori dallo schermo» in the Home and the long lists). The visible area is simulated here
 * (a browser on a computer never shifts it), so the same scenario runs in WebKit (iPhone) and Chromium (Android).
 */
export function fakeVisualViewport() {
  const proto = Object.getPrototypeOf(window.visualViewport);
  const real = { height: Object.getOwnPropertyDescriptor(proto, "height").get, offsetTop: Object.getOwnPropertyDescriptor(proto, "offsetTop").get };
  window.__vv = {};
  Object.defineProperty(proto, "height", { configurable: true, get() { return window.__vv.height ?? real.height.call(this); } });
  Object.defineProperty(proto, "offsetTop", { configurable: true, get() { return window.__vv.offsetTop ?? real.offsetTop.call(this); } });
}

/** The app installed on the Home screen: «display-mode: standalone» and navigator.standalone, as iOS reports them. */
export function standalone() {
  const query = window.matchMedia.bind(window);
  window.matchMedia = media => (/display-mode:\s*standalone/.test(media) ? { ...query("(min-width: 0px)"), media, matches: true } : query(media));
  Object.defineProperty(navigator, "standalone", { get: () => true });
}

export async function barBox(page) {
  const box = await page.locator("[data-bottom-nav]").boundingBox();
  return box && { top: Math.round(box.y), bottom: Math.round(box.y + box.height) };
}

/** The scenario on an open page whose viewport is `height` px tall. */
export async function movedBarComesBack(page, height) {
  await expect(page.locator("[data-bottom-nav]")).toBeVisible();
  await page.waitForLoadState("networkidle");
  const nav = page.locator("[data-bottom-nav]");
  const transform = () => nav.evaluate(node => node.style.transform);
  expect((await barBox(page)).bottom).toBe(height);
  // The keyboard opens on a text field: the visible area is shorter, the bar is not moved (as today).
  await page.evaluate(async h => {
    const field = document.querySelector("input[type=search], input[type=text], [role=searchbox]");
    field?.focus();
    window.__vv = { height: Math.round(h * 0.6), offsetTop: 0 };
    window.visualViewport.dispatchEvent(new Event("resize"));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, height);
  expect(await transform()).toBe("");
  // The keyboard closes and iOS leaves the visible area 120 px lower: the bar goes down to the bottom edge (PROMPT 23).
  await page.evaluate(async h => {
    document.activeElement?.blur();
    window.__vv = { height: h, offsetTop: 120 };
    window.visualViewport.dispatchEvent(new Event("resize"));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, height);
  expect(await transform()).toBe("translate3d(0px, 120px, 0px)");
  expect((await barBox(page)).bottom).toBe(height + 120);
  // The person scrolls; the system realigns the visible area (a «scroll» of the visual viewport, no «resize»): the bar is back.
  await page.evaluate(async h => {
    window.__vv = { height: h, offsetTop: 0 };
    window.scrollBy(0, 200);
    window.visualViewport.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("scroll"));
    await new Promise(resolve => setTimeout(resolve, 100));
  }, height);
  expect(await transform(), "the bar comes back with the scroll").toBe("");
  expect((await barBox(page)).bottom).toBe(height);
  // Only half realigned: the bar follows down to the visible edge, never further out.
  await page.evaluate(async h => {
    window.__vv = { height: h, offsetTop: 120 };
    window.visualViewport.dispatchEvent(new Event("resize"));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    window.__vv = { height: h, offsetTop: 300 };
    window.visualViewport.dispatchEvent(new Event("scroll"));
    await new Promise(resolve => setTimeout(resolve, 50));
  }, height);
  expect(await transform(), "a scroll never moves the bar further out").toBe("translate3d(0px, 120px, 0px)");
  await page.evaluate(async h => {
    window.__vv = { height: h, offsetTop: 40 };
    window.visualViewport.dispatchEvent(new Event("scroll"));
    await new Promise(resolve => setTimeout(resolve, 50));
  }, height);
  expect(await transform(), "it follows the visible edge back up").toBe("translate3d(0px, 40px, 0px)");
  await page.evaluate(async h => {
    window.__vv = { height: h, offsetTop: 0 };
    window.dispatchEvent(new Event("scroll"));
    await new Promise(resolve => setTimeout(resolve, 50));
  }, height);
  expect(await transform()).toBe("");
  expect((await barBox(page)).bottom).toBe(height);
}
