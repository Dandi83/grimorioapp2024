import { test as base, expect } from "@playwright/test";

// The invite to install the app (PROMPT 43) comes with the first gesture of the person: a tap, a key or a scroll,
// also the scroll Playwright makes to bring an element into view before a click. In the tests that are not about the
// invite it would cover the controls at the bottom, so every context of these tests starts with it closed, as after
// «Chiudi». The tests of the invite import @playwright/test directly: e2e/app-leggera.spec.mjs, prima-visita,
// valutazione, sostieni and the compatibility tests.
const closeInvite = () => {
  try { if (!localStorage.getItem("grimorio-install-dismissed")) localStorage.setItem("grimorio-install-dismissed", String(Date.now() + 864e5)); } catch { /* no storage */ }
};

export const test = base.extend({
  context: async ({ context }, provide) => {
    await context.addInitScript(closeInvite);
    await provide(context);
  },
  browser: [async ({ browser }, provide) => {
    const newContext = browser.newContext.bind(browser);
    const wrapped = new Proxy(browser, {
      get(target, key) {
        if (key === "newContext") return async (...args) => {
          const context = await newContext(...args);
          await context.addInitScript(closeInvite);
          return context;
        };
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    await provide(wrapped);
  }, { scope: "worker" }],
});

export { expect };
export { devices } from "@playwright/test";
