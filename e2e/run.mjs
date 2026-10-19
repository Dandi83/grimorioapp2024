// Browser tests against a production build backed by the in-memory test database.
// Usage: npm run test:e2e   (set PW_CHROMIUM_PATH to reuse a preinstalled Chromium)
import { spawn } from "node:child_process";
import { startTestDatabase, TEST_DATABASE_URL } from "./test-db.mjs";

export const E2E_ENV = {
  DATABASE_URL: TEST_DATABASE_URL,
  // Same catalog rules as production: SRD records visible, preview-only pages hidden.
  VERCEL_ENV: "production",
  ADMIN_PASSCODE: "passcode-di-prova-e2e",
  NEXT_TELEMETRY_DISABLED: "1",
};

function run(command, args, env) {
  return new Promise(resolve => {
    const child = spawn(command, args, { stdio: "inherit", env: { ...process.env, ...env } });
    child.on("exit", code => resolve(code ?? 1));
  });
}

const database = await startTestDatabase();
console.log(`[e2e] Test database ready with ${database.spells} spells.`);
let code = 1;
try {
  code = process.argv.includes("--skip-build") ? 0 : await run("npx", ["next", "build"], E2E_ENV);
  if (code === 0) code = await run("npx", ["playwright", "test", ...process.argv.slice(2).filter(arg => arg !== "--skip-build")], E2E_ENV);
} finally {
  await database.stop();
}
process.exit(code);
