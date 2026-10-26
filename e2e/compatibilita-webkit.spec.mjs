import { test } from "@playwright/test";
import { compatibilityTest } from "./compatibilita.mjs";

// WebKit (the engine of every browser on iPhone and iPad, and of Safari on Mac). Not the Chromium binary of PW_CHROMIUM_PATH.
test.use({ browserName: "webkit", launchOptions: {} });
compatibilityTest("webkit");
