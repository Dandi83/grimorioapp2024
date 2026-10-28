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
let code = 1;
try {
  code = process.argv.includes("--skip-build") ? 0 : await run("npx", ["next", "build"], E2E_ENV);
  // Same guard as `npm run build` on Vercel: no full creature sheets in the browser code.
  if (code === 0) code = await run("node", ["scripts/check-client-bundle.mjs"], {});
  if (code === 0) code = await run("npx", ["playwright", "test", ...process.argv.slice(2).filter(arg => arg !== "--skip-build")], E2E_ENV);
} finally {
  await database.stop();
}
process.exit(code);
