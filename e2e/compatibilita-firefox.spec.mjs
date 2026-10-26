import { test } from "@playwright/test";
import { compatibilityTest } from "./compatibilita.mjs";

// Firefox (Gecko) on Android and on the computer. Not the Chromium binary of PW_CHROMIUM_PATH.
test.use({ browserName: "firefox", launchOptions: {} });
compatibilityTest("firefox");
