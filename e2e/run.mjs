// Browser tests against a production build backed by the in-memory test database.
// Usage: npm run test:e2e   (set PW_CHROMIUM_PATH to reuse a preinstalled Chromium)
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { startTestDatabase, TEST_DATABASE_URL } from "./test-db.mjs";

export const E2E_ENV = {
  DATABASE_URL: TEST_DATABASE_URL,
  // Same catalog rules as production: SRD records visible, preview-only pages hidden.
  VERCEL_ENV: "production",
  ADMIN_PASSCODE: "passcode-di-prova-e2e",
  // The reports and homebrew proposals are signed with their own secret, never the passcode.
  FEEDBACK_SECRET: "segreto-moduli-di-prova-e2e",
  // The statistics counted only on http://localhost (e2e/preferiti-contati.spec.mjs): the other tests use 127.0.0.1,
  // where they stay off. A made-up key, for the test database only.
  ANALYTICS_SECRET: "statistiche-di-prova-e2e",
  GRIMORIO_ANALYTICS_TEST_HOST: "localhost",
  NEXT_TELEMETRY_DISABLED: "1",
};

function run(command, args, env) {
  return new Promise(resolve => {
    const child = spawn(command, args, { stdio: "inherit", env: { ...process.env, ...env } });
    child.on("exit", code => resolve(code ?? 1));
  });
}

// Data cached by an earlier run comes from another test database: start empty.
rmSync(".next/cache/fetch-cache", { recursive: true, force: true });
const database = await startTestDatabase();
console.log(`[e2e] Test database ready with ${database.spells} spells.`);
// «I mostri creati da voi» is switched off in the site (lib/community.ts). These specs check what the visitors will see
// once it is on: they run in a second pass, on a build made with the switch on for the tests only (never on Vercel).
export const COMMUNITY_SPECS = ["homebrew.spec.mjs", "creati-da-voi-pubblico.spec.mjs"];
const args = process.argv.slice(2).filter(arg => arg !== "--skip-build");
const files = args.filter(arg => arg.endsWith(".mjs"));
const isCommunity = file => COMMUNITY_SPECS.some(name => file.endsWith(name));
const firstPass = !files.length || files.some(file => !isCommunity(file));
const secondPass = !files.length || files.some(isCommunity);
const skipBuild = process.argv.includes("--skip-build");
let code = 1;
try {
  code = 0;
  if (firstPass) {
    code = skipBuild ? 0 : await run("npx", ["next", "build"], E2E_ENV);
    // Same guard as `npm run build` on Vercel: no full creature sheets in the browser code.
    if (code === 0) code = await run("node", ["scripts/check-client-bundle.mjs"], {});
    if (code === 0) code = await run("npx", ["playwright", "test", ...args.filter(arg => !isCommunity(arg)), "--pass-with-no-tests"], E2E_ENV);
  }
  if (code === 0 && secondPass) {
    const PUBLIC_ENV = { ...E2E_ENV, GRIMORIO_COMMUNITY_TEST_PUBLIC: "on" };
    // A build of its own: the pages built with the switch off would still show the section closed.
    code = skipBuild && !firstPass ? 0 : await run("npx", ["next", "build"], PUBLIC_ENV);
    if (code === 0) code = await run("npx", ["playwright", "test", ...args.filter(arg => !arg.endsWith(".mjs") || isCommunity(arg)), "--pass-with-no-tests"], PUBLIC_ENV);
  }
} finally {
  await database.stop();
}
process.exit(code);
