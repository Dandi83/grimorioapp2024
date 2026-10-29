import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const port = 3100;
// e2e/run.mjs: the specs of «I mostri creati da voi» with the switch on run apart, on their own build.
const COMMUNITY_SPECS = ["**/homebrew.spec.mjs", "**/creati-da-voi-pubblico.spec.mjs"];
const communityOn = process.env.GRIMORIO_COMMUNITY_TEST_PUBLIC === "on";
// Switched on in the code (lib/community.ts, PROMPT 15): every spec in one pass.
const communityInCode = /COMMUNITY_PUBLIC = true;/.test(readFileSync("lib/community.ts", "utf8"));

export default defineConfig({
  testDir: "./e2e",
  ...(communityInCode ? {} : communityOn ? { testMatch: COMMUNITY_SPECS } : { testIgnore: COMMUNITY_SPECS }),
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    // iPhone-sized viewport and touch, rendered with Chromium.
    ...devices["iPhone 13"],
    browserName: "chromium",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
    trace: "retain-on-failure",
  },
  webServer: {
    // Idle connections kept open for 10 minutes: with Node's default (5 s) the server could close a kept-alive
    // connection just as a test reused it after a pause, and the request failed with ECONNRESET (main, 28 October 2026).
    command: `npx next start -p ${port} -H 127.0.0.1 --keepAliveTimeout 600000`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
