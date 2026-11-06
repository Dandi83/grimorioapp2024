import { expect } from "@playwright/test";

// PROMPT 70: what the browser tests of the invite «da TPK» share (e2e/invito-tpk.spec.mjs in Chromium for Android and
// the computer, e2e/invito-tpk-iphone.spec.mjs in WebKit for iPhone and iPad). The tests import @playwright/test
// directly: the fixtures of the other tests close every invite.

export const UA = {
  iphoneSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  iosChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1",
  instagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.3.31.92 (iPhone14,5; iOS 17_4; it_IT; it; scale=3.00; 1170x2532; 600000000)",
  firefoxAndroid: "Mozilla/5.0 (Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0",
};
export const TITLE = "Installa Il Grimorio.App";
export const LINE = "Arrivi da Total Party Kill: tieni il Grimorio sempre a portata di mano, anche offline.";

/**
 * A new visitor: the statistics as on ilgrimorio.app with the bar already answered (the invite is free to show), the
 * events kept to be read by the test. edition: a choice made before (null: none yet). installed: opened from the icon.
 */
export async function tpkVisitor(browser, options, { edition = null, installed = false, plainHttp = false } = {}) {
  const context = await browser.newContext(options);
  await context.addInitScript(value => { try { if (value && !localStorage.getItem("grimorio.edizione")) localStorage.setItem("grimorio.edizione", value); } catch { /* no storage */ } }, edition);
  if (installed) await context.addInitScript(() => {
    const query = window.matchMedia.bind(window);
    window.matchMedia = media => (/display-mode:\s*standalone/.test(media) ? { ...query("(min-width: 0px)"), media, matches: true } : query(media));
    Object.defineProperty(navigator, "standalone", { get: () => true });
  });
  const events = [];
  // The test server is plain http: WebKit follows «upgrade-insecure-requests» and HSTS of the site (e2e/barra-ferma.spec.mjs).
  if (plainHttp) await context.route("**/*", async route => {
    if (new URL(route.request().url()).pathname === "/api/analytics") return route.fallback();
    const response = await route.fetch();
    const headers = { ...response.headers() };
    delete headers["content-security-policy"];
    delete headers["strict-transport-security"];
    await route.fulfill({ response, headers });
  });
  await context.route("**/api/analytics", route => {
    const request = route.request();
    if (request.method() === "GET") return route.fulfill({ json: { enabled: true, excluded: false, consent: "accepted" } });
    events.push(JSON.parse(request.postData() || "{}"));
    return route.fulfill({ json: { ok: true, stored: true } });
  });
  const page = await context.newPage();
  return { context, page, events };
}

export const invite = page => page.locator("[data-install-prompt]");

/** Chromium's install event, sent by hand (headless browsers never send it): accepted. */
export async function sendInstallEvent(page) {
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    event.prompt = async () => { window.__installPrompted = true; };
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(event);
  });
}

/** The invite shown with no gesture, its texts, the address without da=tpk (canonical unchanged), above the bottom bar. */
export async function shownAtOnce(page, path, kind) {
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}da=tpk`);
  await expect(invite(page)).toBeVisible({ timeout: 15_000 });
  await expect(invite(page)).toHaveAttribute("data-tpk-invite", kind);
  await expect(invite(page).getByText(TITLE, { exact: true })).toBeVisible();
  await expect(invite(page).getByText(LINE, { exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/da=tpk/);
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canonical).not.toContain("da=");
  // Fixed above the page: nothing moved, the bottom bar where it was and never covered.
  const shift = await page.evaluate(() => new Promise(resolve => {
    let total = 0;
    new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) total += entry.value; }).observe({ type: "layout-shift", buffered: true });
    setTimeout(() => resolve(total), 500);
  }));
  expect(shift).toBeLessThan(0.01);
  const nav = page.locator("[data-bottom-nav]");
  if (await nav.isVisible()) {
    const box = await invite(page).getByRole("region").boundingBox();
    const bar = await nav.boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(bar.y + 1);
    expect(Math.round(bar.y + bar.height)).toBe(page.viewportSize().height);
  }
  return { canonical };
}

/** The events of the invite sent so far (names only), the origin of the first page view. */
export function sent(events) {
  return {
    names: events.map(event => event.event).filter(name => name.startsWith("tpk_invite_")),
    origin: events.find(event => event.event === "page_view")?.origin,
  };
}
